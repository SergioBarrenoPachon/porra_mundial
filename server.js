const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const path = require('path');
const dbConnector = require('./db');

const TEAM_DATA = {
  "Mexico": { rank: 17, flag: "mx" }, "Sudafrica": { rank: 59, flag: "za" }, "Corea del Sur": { rank: 24, flag: "kr" }, "Rep. Checa": { rank: 36, flag: "cz" },
  "Canada": { rank: 40, flag: "ca" }, "Bosnia y Herzegovina": { rank: 74, flag: "ba" }, "Catar": { rank: 34, flag: "qa" }, "Suiza": { rank: 15, flag: "ch" },
  "Brasil": { rank: 5, flag: "br" }, "Marruecos": { rank: 13, flag: "ma" }, "Haiti": { rank: 86, flag: "ht" }, "Escocia": { rank: 39, flag: "gb-sct" },
  "Estados Unidos": { rank: 16, flag: "us" }, "Paraguay": { rank: 56, flag: "py" }, "Australia": { rank: 25, flag: "au" }, "Turquia": { rank: 35, flag: "tr" },
  "Alemania": { rank: 11, flag: "de" }, "Curazao": { rank: 90, flag: "cw" }, "Costa de Marfil": { rank: 38, flag: "ci" }, "Ecuador": { rank: 30, flag: "ec" },
  "Paises Bajos": { rank: 7, flag: "nl" }, "Japon": { rank: 18, flag: "jp" }, "Suecia": { rank: 23, flag: "se" }, "Tunez": { rank: 41, flag: "tn" },
  "Belgica": { rank: 6, flag: "be" }, "Egipto": { rank: 37, flag: "eg" }, "Iran": { rank: 20, flag: "ir" }, "Nueva Zelanda": { rank: 103, flag: "nz" },
  "Espana": { rank: 3, flag: "es" }, "Cabo Verde": { rank: 65, flag: "cv" }, "Arabia Saudi": { rank: 53, flag: "sa" }, "Uruguay": { rank: 14, flag: "uy" },
  "Francia": { rank: 2, flag: "fr" }, "Senegal": { rank: 19, flag: "sn" }, "Noruega": { rank: 45, flag: "no" }, "Irak": { rank: 55, flag: "iq" },
  "Argentina": { rank: 1, flag: "ar" }, "Argelia": { rank: 44, flag: "dz" }, "Austria": { rank: 22, flag: "at" }, "Jordania": { rank: 71, flag: "jo" },
  "Portugal": { rank: 8, flag: "pt" }, "RD Congo": { rank: 62, flag: "cd" }, "Uzbekistan": { rank: 66, flag: "uz" }, "Colombia": { rank: 12, flag: "co" },
  "Inglaterra": { rank: 4, flag: "gb-eng" }, "Croacia": { rank: 10, flag: "hr" }, "Ghana": { rank: 64, flag: "gh" }, "Panama": { rank: 43, flag: "pa" }
};

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = "porrasupersecretkey2026";
const DEADLINE = new Date("2026-06-13T21:00:00+02:00"); // Sat, Jun 13, 2026, 9:00 PM GMT+2

app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Database helper functions (async database wrappers)
async function readDb() {
  return await dbConnector.readDb();
}

async function writeDb(data) {
  await dbConnector.writeDb(data);
}

// Password hashing helper
function hashPassword(password, salt) {
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

// Middleware: Authenticate JWT Token
function authenticateToken(req, res, next) {
  const token = req.cookies.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
  if (!token) {
    return res.status(401).json({ error: "No autenticado. Por favor inicia sesión." });
  }
  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(403).json({ error: "Token inválido o expirado." });
  }
}

// Middleware: Authenticate Admin
function requireAdmin(req, res, next) {
  authenticateToken(req, res, () => {
    if (req.user && req.user.isAdmin) {
      next();
    } else {
      res.status(403).json({ error: "Acceso denegado. Se requieren permisos de administrador." });
    }
  });
}

// ==============================================================================
// AUTHENTICATION API
// ==============================================================================

// Register a new participant
app.post('/api/auth/register', (req, res) => {
  return res.status(403).json({ error: "El registro de nuevos participantes está deshabilitado." });
});

// Public endpoint: list usernames for login dropdown
app.get('/api/users-list', async (req, res) => {
  try {
    const db = await readDb();
    const users = db.users.map(u => ({ username: u.username }));
    res.json(users);
  } catch (err) {
    console.error("Error en /api/users-list:", err);
    res.status(500).json({ error: "Error al recuperar los usuarios." });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Usuario y contraseña son requeridos." });
    }
    
    const db = await readDb();
    const lowerUsername = username.toLowerCase().trim();
    const user = db.users.find(u => u.username.toLowerCase() === lowerUsername);
    
    if (!user) {
      return res.status(400).json({ error: "Usuario o contraseña incorrectos." });
    }
    
    const hash = hashPassword(password, user.salt);
    if (hash !== user.passwordHash) {
      return res.status(400).json({ error: "Usuario o contraseña incorrectos." });
    }
    
    const token = jwt.sign({ id: user.id, username: user.username, isAdmin: !!user.isAdmin }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ message: "Sesión iniciada con éxito.", user: { id: user.id, username: user.username, isAdmin: !!user.isAdmin } });
  } catch (err) {
    console.error("Error en /api/auth/login:", err);
    res.status(500).json({ error: "Error en la autenticación." });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: "Sesión cerrada." });
});

// Get current session user info
app.get('/api/auth/me', (req, res) => {
  const token = req.cookies.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
  if (!token) {
    return res.json({ user: null });
  }
  try {
    const verified = jwt.verify(token, JWT_SECRET);
    res.json({ user: { id: verified.id, username: verified.username, isAdmin: verified.isAdmin } });
  } catch (err) {
    res.json({ user: null });
  }
});

// ==============================================================================
// PREDICTIONS API
// ==============================================================================

// Helper: check if deadline is passed
function isDeadlinePassed() {
  return Date.now() > DEADLINE.getTime();
}

// Get deadline status
app.get('/api/predictions/deadline', (req, res) => {
  res.json({
    deadline: DEADLINE.toISOString(),
    epoch: DEADLINE.getTime(),
    now: Date.now(),
    isPassed: isDeadlinePassed()
  });
});

// Get matches schema
app.get('/api/matches', async (req, res) => {
  try {
    const db = await readDb();
    const resolvedMatches = resolveActualKnockoutMatches(db.matches);
    res.json(resolvedMatches);
  } catch (err) {
    console.error("Error en /api/matches:", err);
    res.status(500).json({ error: "Error al recuperar los partidos." });
  }
});

// Get user predictions (only allowed for authenticated owner, or admin)
app.get('/api/predictions/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    if (req.user.id !== userId && !req.user.isAdmin) {
      return res.status(403).json({ error: "No tienes permiso para ver estas predicciones." });
    }
    
    const db = await readDb();
    const userPred = db.predictions[userId] || { matches: {}, specials: {} };
    res.json(userPred);
  } catch (err) {
    console.error("Error en GET /api/predictions/:userId:", err);
    res.status(500).json({ error: "Error al recuperar las predicciones." });
  }
});

// Submit/Update user predictions
app.post('/api/predictions/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    if (req.user.id !== userId && !req.user.isAdmin) {
      return res.status(403).json({ error: "No tienes permiso para editar estas predicciones." });
    }
    
    if (isDeadlinePassed() && !req.user.isAdmin) {
      return res.status(403).json({ error: "La fecha límite para enviar o modificar predicciones ha expirado (Sábado 13/06/2026 21:00)." });
    }
    
    const { matches, specials } = req.body;
    if (!matches || !specials) {
      return res.status(400).json({ error: "Datos de predicción incorrectos." });
    }
    
    const db = await readDb();
    
    // Update predictions for the user
    db.predictions[userId] = {
      matches: matches, // { matchId: { gl, gv, pkl, pkv } }
      specials: {
        balon_oro: specials.balon_oro || "",
        balon_plata: specials.balon_plata || "",
        balon_bronce: specials.balon_bronce || "",
        bota_oro: specials.bota_oro || "",
        bota_plata: specials.bota_plata || "",
        bota_bronce: specials.bota_bronce || ""
      }
    };
    
    await writeDb(db);
    res.json({ message: "Predicciones guardadas correctamente." });
  } catch (err) {
    console.error("Error en POST /api/predictions/:userId:", err);
    res.status(500).json({ error: "Error al guardar las predicciones." });
  }
});

// Get predictions of ALL participants (only allowed AFTER deadline, or for admin)
app.get('/api/predictions-master', authenticateToken, async (req, res) => {
  try {
    if (!isDeadlinePassed() && !req.user.isAdmin) {
      return res.status(403).json({ error: "Las predicciones de otros participantes estarán bloqueadas hasta el cierre de la fecha límite." });
    }
    
    const db = await readDb();
    // Map predictions to user names
    const result = {};
    for (const userId in db.predictions) {
      const userObj = db.users.find(u => u.id === userId);
      if (userObj && (!userObj.isAdmin || userObj.username === "Sergio B")) {
        result[userObj.username] = db.predictions[userId];
      }
    }
    res.json(result);
  } catch (err) {
    console.error("Error en /api/predictions-master:", err);
    res.status(500).json({ error: "Error al recuperar los pronósticos grupales." });
  }
});

// ==============================================================================
// LEADERBOARD AND DASHBOARD API
// ==============================================================================

// Helper: Calculate participant score
// Helper to calculate the winner of a match based on scores and penalties
function getMatchWinner(local, visitor, gl, gv, pkl, pkv) {
  if (gl === null || gl === undefined || gl === "" || gv === null || gv === undefined || gv === "") {
    return null;
  }
  const goalsL = parseInt(gl);
  const goalsV = parseInt(gv);
  if (goalsL > goalsV) return local;
  if (goalsL < goalsV) return visitor;
  
  // Tie: check penalties
  if (pkl === null || pkl === undefined || pkl === "" || pkv === null || pkv === undefined || pkv === "") {
    return null;
  }
  const pkL = parseInt(pkl);
  const pkV = parseInt(pkv);
  if (pkL > pkV) return local;
  if (pkL < pkV) return visitor;
  return null;
}

// Simulates the bracket progression for a user's predictions (or actual matches)
function calculateUserBracket(predObj, dbMatches) {
  const standings = {};
  const groups = ['A','B','C','D','E','F','G','H','I','J','K','L'];
  
  groups.forEach(g => {
    standings[g] = [];
    const groupMatches = dbMatches.filter(m => m.phase === 'Group Stage' && m.group === g);
    const teams = new Set();
    groupMatches.forEach(m => {
      teams.add(m.local);
      teams.add(m.visitor);
    });
    
    teams.forEach(t => {
      standings[g].push({
        team: t,
        pts: 0,
        gf: 0,
        gc: 0,
        dg: 0,
        fifaRank: TEAM_DATA[t]?.rank || 150
      });
    });
  });
  
  dbMatches.forEach(m => {
    if (m.phase !== 'Group Stage') return;
    const g = m.group;
    const pred = predObj.matches[m.id];
    if (pred && pred.gl !== '' && pred.gl !== undefined && pred.gl !== null &&
                pred.gv !== '' && pred.gv !== undefined && pred.gv !== null) {
      const gl = parseInt(pred.gl);
      const gv = parseInt(pred.gv);
      const localTeam = standings[g].find(x => x.team === m.local);
      const visitorTeam = standings[g].find(x => x.team === m.visitor);
      if (localTeam && visitorTeam) {
        localTeam.gf += gl;
        localTeam.gc += gv;
        localTeam.dg += (gl - gv);
        visitorTeam.gf += gv;
        visitorTeam.gc += gl;
        visitorTeam.dg += (gv - gl);
        if (gl > gv) {
          localTeam.pts += 3;
        } else if (gv > gl) {
          visitorTeam.pts += 3;
        } else {
          localTeam.pts += 1;
          visitorTeam.pts += 1;
        }
      }
    }
  });
  
  groups.forEach(g => {
    standings[g].sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.dg !== a.dg) return b.dg - a.dg;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return a.fifaRank - b.fifaRank;
    });
  });
  
  const thirds = [];
  for (const g in standings) {
    const t3 = standings[g][2];
    if (t3) {
      const groupMatches = dbMatches.filter(m => m.phase === 'Group Stage' && m.group === g);
      const isCompleted = groupMatches.every(m => {
        const p = predObj.matches[m.id];
        return p && p.gl !== '' && p.gl !== undefined && p.gl !== null &&
                    p.gv !== '' && p.gv !== undefined && p.gv !== null;
      });
      thirds.push({
        group: g,
        team: isCompleted ? t3.team : `3º Grupo ${g}`,
        pts: isCompleted ? t3.pts : 0,
        gf: isCompleted ? t3.gf : 0,
        gc: isCompleted ? t3.gc : 0,
        dg: isCompleted ? t3.dg : 0,
        fifaRank: t3.fifaRank
      });
    }
  }
  thirds.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.dg !== a.dg) return b.dg - a.dg;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return a.fifaRank - b.fifaRank;
  });
  const top8Thirds = thirds.slice(0, 8);
  
  const advanceTeams = {
    "3o Top 1": top8Thirds[0]?.team || "3º Mejor 1",
    "3o Top 2": top8Thirds[1]?.team || "3º Mejor 2",
    "3o Top 3": top8Thirds[2]?.team || "3º Mejor 3",
    "3o Top 4": top8Thirds[3]?.team || "3º Mejor 4",
    "3o Top 5": top8Thirds[4]?.team || "3º Mejor 5",
    "3o Top 6": top8Thirds[5]?.team || "3º Mejor 6",
    "3o Top 7": top8Thirds[6]?.team || "3º Mejor 7",
    "3o Top 8": top8Thirds[7]?.team || "3º Mejor 8"
  };
  groups.forEach(g => {
    const groupMatches = dbMatches.filter(m => m.phase === 'Group Stage' && m.group === g);
    const isCompleted = groupMatches.every(m => {
      const p = predObj.matches[m.id];
      return p && p.gl !== '' && p.gl !== undefined && p.gl !== null &&
                  p.gv !== '' && p.gv !== undefined && p.gv !== null;
    });
    advanceTeams[`1${g}`] = isCompleted ? (standings[g][0]?.team || `1º Grupo ${g}`) : `1º Grupo ${g}`;
    advanceTeams[`2${g}`] = isCompleted ? (standings[g][1]?.team || `2º Grupo ${g}`) : `2º Grupo ${g}`;
  });
  
  const bracketTeams = {};
  const userMatches = {};
  
  const r32Matches = [
    { id: "M73", label: "D1", lRef: "1A", vRef: "3o Top 1" },
    { id: "M74", label: "D2", lRef: "2A", vRef: "2B" },
    { id: "M75", label: "D3", lRef: "1B", vRef: "3o Top 2" },
    { id: "M76", label: "D4", lRef: "1C", vRef: "3o Top 3" },
    { id: "M77", label: "D5", lRef: "2C", vRef: "2D" },
    { id: "M78", label: "D6", lRef: "1D", vRef: "3o Top 4" },
    { id: "M79", label: "D7", lRef: "1E", vRef: "3o Top 5" },
    { id: "M80", label: "D8", lRef: "2E", vRef: "2F" },
    { id: "M81", label: "D9", lRef: "1F", vRef: "3o Top 6" },
    { id: "M82", label: "D10", lRef: "1G", vRef: "3o Top 7" },
    { id: "M83", label: "D11", lRef: "2G", vRef: "2H" },
    { id: "M84", label: "D12", lRef: "1H", vRef: "3o Top 8" },
    { id: "M85", label: "D13", lRef: "1I", vRef: "2J" },
    { id: "M86", label: "D14", lRef: "1J", vRef: "2K" },
    { id: "M87", label: "D15", lRef: "1K", vRef: "2L" },
    { id: "M88", label: "D16", lRef: "1L", vRef: "2I" }
  ];
  
  r32Matches.forEach(m => {
    const local = advanceTeams[m.lRef];
    const visitor = advanceTeams[m.vRef];
    const pred = predObj.matches[m.id] || { gl: '', gv: '', pkl: '', pkv: '' };
    const winner = getMatchWinner(local, visitor, pred.gl, pred.gv, pred.pkl, pred.pkv);
    const loser = (winner === local) ? visitor : ((winner === visitor) ? local : null);
    bracketTeams[m.label] = winner;
    userMatches[m.id] = { local, visitor, winner, loser };
  });
  
  const r16Matches = [
    { id: "M89", label: "O1", lRef: "D1", vRef: "D2" },
    { id: "M90", label: "O2", lRef: "D3", vRef: "D4" },
    { id: "M91", label: "O3", lRef: "D5", vRef: "D6" },
    { id: "M92", label: "O4", lRef: "D7", vRef: "D8" },
    { id: "M93", label: "O5", lRef: "D9", vRef: "D10" },
    { id: "M94", label: "O6", lRef: "D11", vRef: "D12" },
    { id: "M95", label: "O7", lRef: "D13", vRef: "D14" },
    { id: "M96", label: "O8", lRef: "D15", vRef: "D16" }
  ];
  r16Matches.forEach(m => {
    const local = bracketTeams[m.lRef] || `Ganador ${m.lRef}`;
    const visitor = bracketTeams[m.vRef] || `Ganador ${m.vRef}`;
    const pred = predObj.matches[m.id] || { gl: '', gv: '', pkl: '', pkv: '' };
    const winner = getMatchWinner(local, visitor, pred.gl, pred.gv, pred.pkl, pred.pkv);
    const loser = (winner === local) ? visitor : ((winner === visitor) ? local : null);
    bracketTeams[m.label] = winner;
    userMatches[m.id] = { local, visitor, winner, loser };
  });
  
  const r8Matches = [
    { id: "M97", label: "C1", lRef: "O1", vRef: "O2" },
    { id: "M98", label: "C2", lRef: "O3", vRef: "O4" },
    { id: "M99", label: "C3", lRef: "O5", vRef: "O6" },
    { id: "M100", label: "C4", lRef: "O7", vRef: "O8" }
  ];
  r8Matches.forEach(m => {
    const local = bracketTeams[m.lRef] || `Ganador ${m.lRef}`;
    const visitor = bracketTeams[m.vRef] || `Ganador ${m.vRef}`;
    const pred = predObj.matches[m.id] || { gl: '', gv: '', pkl: '', pkv: '' };
    const winner = getMatchWinner(local, visitor, pred.gl, pred.gv, pred.pkl, pred.pkv);
    const loser = (winner === local) ? visitor : ((winner === visitor) ? local : null);
    bracketTeams[m.label] = winner;
    userMatches[m.id] = { local, visitor, winner, loser };
  });
  
  const s1Local = bracketTeams["C1"] || "Ganador C1";
  const s1Visitor = bracketTeams["C2"] || "Ganador C2";
  const s2Local = bracketTeams["C3"] || "Ganador C3";
  const s2Visitor = bracketTeams["C4"] || "Ganador C4";
  
  const s1Pred = predObj.matches["M101"] || { gl: '', gv: '', pkl: '', pkv: '' };
  const s2Pred = predObj.matches["M102"] || { gl: '', gv: '', pkl: '', pkv: '' };
  
  const s1Winner = getMatchWinner(s1Local, s1Visitor, s1Pred.gl, s1Pred.gv, s1Pred.pkl, s1Pred.pkv);
  const s2Winner = getMatchWinner(s2Local, s2Visitor, s2Pred.gl, s2Pred.gv, s2Pred.pkl, s2Pred.pkv);
  
  const s1Loser = s1Winner ? ((s1Winner === s1Local) ? s1Visitor : s1Local) : null;
  const s2Loser = s2Winner ? ((s2Winner === s2Local) ? s2Visitor : s2Local) : null;
  
  userMatches["M101"] = { local: s1Local, visitor: s1Visitor, winner: s1Winner, loser: s1Loser };
  userMatches["M102"] = { local: s2Local, visitor: s2Visitor, winner: s2Winner, loser: s2Loser };
  
  const t3Local = s1Loser || "Perdedor S1";
  const t3Visitor = s2Loser || "Perdedor S2";
  const t3Pred = predObj.matches["M103"] || { gl: '', gv: '', pkl: '', pkv: '' };
  const t3Winner = getMatchWinner(t3Local, t3Visitor, t3Pred.gl, t3Pred.gv, t3Pred.pkl, t3Pred.pkv);
  const t3Loser = t3Winner ? ((t3Winner === t3Local) ? t3Visitor : t3Local) : null;
  userMatches["M103"] = { local: t3Local, visitor: t3Visitor, winner: t3Winner, loser: t3Loser };
  
  const finalLocal = s1Winner || "Ganador S1";
  const finalVisitor = s2Winner || "Ganador S2";
  const finalPred = predObj.matches["M104"] || { gl: '', gv: '', pkl: '', pkv: '' };
  const finalWinner = getMatchWinner(finalLocal, finalVisitor, finalPred.gl, finalPred.gv, finalPred.pkl, finalPred.pkv);
  const finalLoser = finalWinner ? ((finalWinner === finalLocal) ? finalVisitor : finalLocal) : null;
  userMatches["M104"] = { local: finalLocal, visitor: finalVisitor, winner: finalWinner, loser: finalLoser };
  
  return userMatches;
}

// Injects actual advancing team names into bracket matches in the list
function resolveActualKnockoutMatches(matchesList) {
  const officialPredObj = { matches: {}, specials: {} };
  matchesList.forEach(m => {
    officialPredObj.matches[m.id] = { gl: m.gl, gv: m.gv, pkl: m.pkl, pkv: m.pkv };
  });
  
  const actualBracket = calculateUserBracket(officialPredObj, matchesList);
  
  const cloned = JSON.parse(JSON.stringify(matchesList));
  cloned.forEach(m => {
    if (m.phase !== 'Group Stage') {
      const act = actualBracket[m.id];
      if (act) {
        m.local = act.local;
        m.visitor = act.visitor;
      }
    }
  });
  return cloned;
}

// Helper: Calculate participant score
function calculateParticipantScore(predObj, matchesList, config, winners) {
  let matchPoints = 0;
  
  // 1. Score Group Stage matches
  matchesList.forEach(m => {
    if (m.phase !== 'Group Stage') return;
    if (m.gl !== null && m.gv !== null && m.gl !== "" && m.gv !== "") {
      const pred = predObj.matches[m.id];
      if (pred && pred.gl !== undefined && pred.gv !== undefined && pred.gl !== null && pred.gv !== null && pred.gl !== "" && pred.gv !== "") {
        const realGl = parseInt(m.gl);
        const realGv = parseInt(m.gv);
        const predGl = parseInt(pred.gl);
        const predGv = parseInt(pred.gv);
        
        const isExact = (realGl === predGl) && (realGv === predGv);
        const realDiff = realGl - realGv;
        const predDiff = predGl - predGv;
        const isOutcome = Math.sign(realDiff) === Math.sign(predDiff);
        
        if (isExact) {
          matchPoints += config.points.exact;
        } else if (isOutcome) {
          matchPoints += config.points.outcome;
        }
      }
    }
  });
  
  // 2. Score Knockout Stage matches (Bracket-aware winner matching)
  const officialPredObj = { matches: {}, specials: {} };
  matchesList.forEach(m => {
    officialPredObj.matches[m.id] = { gl: m.gl, gv: m.gv, pkl: m.pkl, pkv: m.pkv };
  });
  
  const actualBracket = calculateUserBracket(officialPredObj, matchesList);
  const userBracket = calculateUserBracket(predObj, matchesList);
  
  const knockoutIds = [];
  for (let i = 73; i <= 104; i++) {
    knockoutIds.push(`M${i}`);
  }
  
  knockoutIds.forEach(mId => {
    const act = actualBracket[mId];
    const usr = userBracket[mId];
    if (act && act.winner && usr && usr.winner) {
      if (act.winner === usr.winner) {
        // Correct advancing team
        let earned = config.points.outcome;
        
        // Check if matchup was exactly correct AND score was exact
        if (act.local === usr.local && act.visitor === usr.visitor) {
          const m = matchesList.find(x => x.id === mId);
          const pred = predObj.matches[mId];
          if (m && pred && pred.gl !== '' && pred.gl !== undefined && pred.gl !== null &&
                      pred.gv !== '' && pred.gv !== undefined && pred.gv !== null) {
            const realGl = parseInt(m.gl);
            const realGv = parseInt(m.gv);
            const predGl = parseInt(pred.gl);
            const predGv = parseInt(pred.gv);
            if (realGl === predGl && realGv === predGv) {
              earned = config.points.exact;
            }
          }
        }
        matchPoints += earned;
      }
    }
  });
  
  // 3. Specials points
  const matchAward = (pred, winner) => {
    if (!pred || !winner) return false;
    return pred.trim().toLowerCase() === winner.trim().toLowerCase();
  };

  let balonOroPts = matchAward(predObj.specials.balon_oro, winners.balon_oro) ? config.points.balon_oro : 0;
  let balonPlataPts = matchAward(predObj.specials.balon_plata, winners.balon_plata) ? config.points.balon_plata : 0;
  let balonBroncePts = matchAward(predObj.specials.balon_bronce, winners.balon_bronce) ? config.points.balon_bronce : 0;
  let botaOroPts = matchAward(predObj.specials.bota_oro, winners.bota_oro) ? config.points.bota_oro : 0;
  let botaPlataPts = matchAward(predObj.specials.bota_plata, winners.bota_plata) ? config.points.bota_plata : 0;
  let botaBroncePts = matchAward(predObj.specials.bota_bronce, winners.bota_bronce) ? config.points.bota_bronce : 0;
  
  const totalSpecials = balonOroPts + balonPlataPts + balonBroncePts + botaOroPts + botaPlataPts + botaBroncePts;
  const total = matchPoints + totalSpecials;
  
  return {
    matchPoints,
    balonOroPts,
    balonPlataPts,
    balonBroncePts,
    botaOroPts,
    botaPlataPts,
    botaBroncePts,
    totalSpecials,
    total
  };
}

// Get Leaderboard
app.get('/api/leaderboard', async (req, res) => {
  try {
    const db = await readDb();
    const list = [];
    
    db.users.forEach(u => {
      if (u.isAdmin && u.username !== "Sergio B") return;
      const predObj = db.predictions[u.id] || { matches: {}, specials: {} };
      const score = calculateParticipantScore(predObj, db.matches, db.config, db.config.winners);
      
      list.push({
        userId: u.id,
        username: u.username,
        ...score
      });
    });
    
    // Sort descending by total, then by matchPoints
    list.sort((a, b) => b.total - a.total || b.matchPoints - a.matchPoints || a.username.localeCompare(b.username));
    
    // Add ranks sequentially to avoid podium / leaderboard gaps in case of ties
    list.forEach((p, idx) => {
      p.rank = idx + 1;
    });
    
    res.json({
      leaderboard: list,
      config: db.config,
      rankingHistory: db.rankingHistory
    });
  } catch (err) {
    console.error("Error en /api/leaderboard:", err);
    res.status(500).json({ error: "Error al recuperar la clasificación." });
  }
});

// ==============================================================================
// ADMIN MANAGEMENT API
// ==============================================================================

// Get admin status of database (for display in admin view)
app.get('/api/admin/dashboard', requireAdmin, async (req, res) => {
  try {
    const db = await readDb();
    res.json({
      config: db.config,
      usersCount: db.users.filter(u => !u.isAdmin || u.username === "Sergio B").length,
      predictionsCount: Object.keys(db.predictions).length,
      matches: resolveActualKnockoutMatches(db.matches)
    });
  } catch (err) {
    console.error("Error en /api/admin/dashboard:", err);
    res.status(500).json({ error: "Error al recuperar el panel de administrador." });
  }
});

// Update Point Settings
app.post('/api/admin/config-points', requireAdmin, async (req, res) => {
  try {
    const { points } = req.body;
    if (!points) {
      return res.status(400).json({ error: "Settings missing." });
    }
    
    const db = await readDb();
    db.config.points = {
      outcome: parseInt(points.outcome) || 1,
      exact: parseInt(points.exact) || 3,
      balon_oro: parseInt(points.balon_oro) || 10,
      balon_plata: parseInt(points.balon_plata) || 5,
      balon_bronce: parseInt(points.balon_bronce) || 3,
      bota_oro: parseInt(points.bota_oro) || 10,
      bota_plata: parseInt(points.bota_plata) || 5,
      bota_bronce: parseInt(points.bota_bronce) || 3
    };
    
    await writeDb(db);
    res.json({ message: "Configuración de puntos actualizada.", config: db.config });
  } catch (err) {
    console.error("Error en /api/admin/config-points:", err);
    res.status(500).json({ error: "Error al actualizar la configuración de puntos." });
  }
});

// Update Official Award Winners
app.post('/api/admin/config-winners', requireAdmin, async (req, res) => {
  try {
    const { winners } = req.body;
    if (!winners) {
      return res.status(400).json({ error: "Winners missing." });
    }
    
    const db = await readDb();
    db.config.winners = {
      balon_oro: winners.balon_oro || "",
      balon_plata: winners.balon_plata || "",
      balon_bronce: winners.balon_bronce || "",
      bota_oro: winners.bota_oro || "",
      bota_plata: winners.bota_plata || "",
      bota_bronce: winners.bota_bronce || ""
    };
    
    await writeDb(db);
    res.json({ message: "Ganadores oficiales actualizados.", config: db.config });
  } catch (err) {
    console.error("Error en /api/admin/config-winners:", err);
    res.status(500).json({ error: "Error al registrar ganadores oficiales." });
  }
});

// Change Admin Password
app.post('/api/admin/change-password', requireAdmin, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.trim() === "" || password.length < 6) {
      return res.status(400).json({ error: "Contraseña inválida. Debe tener al menos 6 caracteres." });
    }
    
    const db = await readDb();
    const adminUser = db.users.find(u => u.isAdmin);
    if (!adminUser) {
      return res.status(404).json({ error: "Usuario administrador no encontrado." });
    }
    
    const salt = crypto.randomBytes(16).toString('hex');
    adminUser.salt = salt;
    adminUser.passwordHash = hashPassword(password, salt);
    
    await writeDb(db);
    res.json({ message: "Contraseña de administrador actualizada con éxito." });
  } catch (err) {
    console.error("Error en /api/admin/change-password:", err);
    res.status(500).json({ error: "Error al cambiar la contraseña." });
  }
});

// Update Match Results (and auto-calculate ranking evolution)
app.post('/api/admin/matches/:matchId', requireAdmin, async (req, res) => {
  try {
    const { matchId } = req.params;
    const { gl, gv, pkl, pkv } = req.body;
    
    const db = await readDb();
    const matchIndex = db.matches.findIndex(m => m.id === matchId);
    if (matchIndex === -1) {
      return res.status(404).json({ error: "Partido no encontrado." });
    }
    
    // Parse goals
    const finalGl = (gl === null || gl === undefined || gl === "") ? null : parseInt(gl);
    const finalGv = (gv === null || gv === undefined || gv === "") ? null : parseInt(gv);
    
    // Parse penalties (only if tie and not group stage)
    const isKnockout = db.matches[matchIndex].phase !== "Group Stage";
    let finalPkl = null;
    let finalPkv = null;
    if (isKnockout && finalGl === finalGv && finalGl !== null) {
      finalPkl = (pkl === null || pkl === undefined || pkl === "") ? null : parseInt(pkl);
      finalPkv = (pkv === null || pkv === undefined || pkv === "") ? null : parseInt(pkv);
    }
    
    // Update match record
    db.matches[matchIndex].gl = finalGl;
    db.matches[matchIndex].gv = finalGv;
    db.matches[matchIndex].pkl = finalPkl;
    db.matches[matchIndex].pkv = finalPkv;
    
    // --------------------------------------------------------------------------
    // RANKING SNAPSHOT FOR EVOLUTION CHART
    // --------------------------------------------------------------------------
    // Calculate rankings UP TO the current state of matches (only counting matches with results)
    if (finalGl !== null && finalGv !== null) {
      // Check if snapshot for this match already exists, if so, delete it
      db.rankingHistory = db.rankingHistory.filter(h => h.matchId !== matchId);
      
      // Compile points up to this match for all users using the unified helper
      const userStandings = [];
      db.users.forEach(u => {
        if (u.isAdmin && u.username !== "Sergio B") return;
        const predObj = db.predictions[u.id] || { matches: {}, specials: {} };
        const score = calculateParticipantScore(predObj, db.matches, db.config, {});
        userStandings.push({
          username: u.username,
          points: score.matchPoints
        });
      });
      
      // Sort and assign ranks
      userStandings.sort((a, b) => b.points - a.points || a.username.localeCompare(b.username));
      
      let currentRank = 0;
      let currentPoints = -1;
      const ranks = {};
      const pointsMap = {};
      userStandings.forEach((p, idx) => {
        if (p.points !== currentPoints) {
          currentRank = idx + 1;
          currentPoints = p.points;
        }
        ranks[p.username] = currentRank;
        pointsMap[p.username] = p.points;
      });
      
      // Add snapshot record
      db.rankingHistory.push({
        matchId: matchId,
        timestamp: Date.now(),
        ranks: ranks,
        points: pointsMap
      });
      
      // Sort history by match ID order
      db.rankingHistory.sort((a, b) => {
        const idxA = db.matches.findIndex(m => m.id === a.matchId);
        const idxB = db.matches.findIndex(m => m.id === b.matchId);
        return idxA - idxB;
      });
    } else {
      // If goals were cleared, delete snapshot for this match
      db.rankingHistory = db.rankingHistory.filter(h => h.matchId !== matchId);
    }
    
    await writeDb(db);
    const resolvedMatches = resolveActualKnockoutMatches(db.matches);
    res.json({ message: "Resultado del partido guardado con éxito.", match: resolvedMatches[matchIndex] });
  } catch (err) {
    console.error("Error en /api/admin/matches/:matchId:", err);
    res.status(500).json({ error: "Error al actualizar el marcador del partido." });
  }
});

// Reset all data (predictions, match results, ranking history) – admin only
app.post('/api/admin/reset-data', requireAdmin, async (req, res) => {
  try {
    const db = await readDb();
    
    // Clear all predictions for every user
    for (const userId in db.predictions) {
      db.predictions[userId] = {
        matches: {},
        specials: {
          balon_oro: "",
          balon_plata: "",
          balon_bronce: "",
          bota_oro: "",
          bota_plata: "",
          bota_bronce: ""
        }
      };
    }
    
    // Clear all match results
    db.matches.forEach(m => {
      m.gl = null;
      m.gv = null;
      m.pkl = null;
      m.pkv = null;
    });
    
    // Clear ranking history
    db.rankingHistory = [];
    
    // Clear official winners
    db.config.winners = {
      balon_oro: "",
      balon_plata: "",
      balon_bronce: "",
      bota_oro: "",
      bota_plata: "",
      bota_bronce: ""
    };
    
    await writeDb(db);
    console.log('⚠️  ADMIN RESET: All predictions, match results, and ranking history have been cleared.');
    res.json({ message: "Todos los datos han sido reseteados correctamente. Las cuentas de usuario se mantienen." });
  } catch (err) {
    console.error("Error en /api/admin/reset-data:", err);
    res.status(500).json({ error: "Error al resetear los datos del juego." });
  }
});

// Serve frontend routing fallback
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize database and start listening
dbConnector.initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`\n=============================================================`);
    console.log(`⚽ PORRA MUNDIAL 2026 SERVER RUNNING AT: http://localhost:${PORT}`);
    console.log(`🔒 Prediction Deadline: ${DEADLINE.toLocaleString()}`);
    console.log(`=============================================================\n`);
  });
}).catch(err => {
  console.error("❌ Fatal Error: Could not initialize database:", err);
  process.exit(1);
});
