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

// Database health endpoint
app.get('/api/db-status', async (req, res) => {
  try {
    const status = await dbConnector.getDbStatus();
    res.json(status);
  } catch (err) {
    console.error("Error en /api/db-status:", err);
    res.status(500).json({ error: "Error al recuperar el estado de la base de datos." });
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

// Helper: check if a section is editable for a given user
function isSectionEditable(reqUser, targetUser, section) {
  if (reqUser && reqUser.isAdmin) return true;
  if (!isDeadlinePassed()) return true;
  if (targetUser && targetUser.unlockOverrides && targetUser.unlockOverrides[section]) {
    return new Date(targetUser.unlockOverrides[section]) > new Date();
  }
  return false;
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
    
    const targetUser = db.users.find(u => u.id === userId);
    const locks = {
      groups: !isSectionEditable(req.user, targetUser, 'groups'),
      knockouts: !isSectionEditable(req.user, targetUser, 'knockouts'),
      awards: !isSectionEditable(req.user, targetUser, 'awards')
    };
    
    res.json({
      ...userPred,
      locks
    });
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
    
    const db = await readDb();
    const targetUser = db.users.find(u => u.id === userId);
    if (!targetUser) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }
    
    const canEditGroups = isSectionEditable(req.user, targetUser, 'groups');
    const canEditKnockouts = isSectionEditable(req.user, targetUser, 'knockouts');
    const canEditAwards = isSectionEditable(req.user, targetUser, 'awards');
    
    if (!canEditGroups && !canEditKnockouts && !canEditAwards) {
      return res.status(403).json({ error: "La fecha límite ha expirado y no tienes permisos de desbloqueo para esta sección." });
    }
    
    const { matches, specials } = req.body;
    if (!matches || !specials) {
      return res.status(400).json({ error: "Datos de predicción incorrectos." });
    }
    
    const oldPred = db.predictions[userId] || { matches: {}, specials: {} };
    const newMatches = {};
    
    db.matches.forEach(m => {
      const mId = m.id;
      const isGroup = m.phase === 'Group Stage';
      const editable = isGroup ? canEditGroups : canEditKnockouts;
      
      if (editable) {
        if (matches[mId] !== undefined) {
          newMatches[mId] = matches[mId];
        } else {
          newMatches[mId] = { gl: '', gv: '', pkl: '', pkv: '' };
        }
      } else {
        if (oldPred.matches && oldPred.matches[mId] !== undefined) {
          newMatches[mId] = oldPred.matches[mId];
        } else {
          newMatches[mId] = { gl: '', gv: '', pkl: '', pkv: '' };
        }
      }
    });
    
    const newSpecials = {};
    const awardsKeys = ['balon_oro', 'balon_plata', 'balon_bronce', 'bota_oro', 'bota_plata', 'bota_bronce'];
    awardsKeys.forEach(k => {
      if (canEditAwards) {
        newSpecials[k] = specials[k] || "";
      } else {
        newSpecials[k] = (oldPred.specials && oldPred.specials[k]) || "";
      }
    });
    
    // Update predictions for the user
    db.predictions[userId] = {
      matches: newMatches,
      specials: newSpecials
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
      if (userObj && (!userObj.isAdmin || userObj.username === "Sergio B") && userObj.showInLeaderboard !== false) {
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
function calculateUserBracket(predObj, dbMatches, isReal = false) {
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
    "3o Top 8": top8Thirds[7]?.team || "3º Mejor 8",
    "3º Top 1": top8Thirds[0]?.team || "3º Mejor 1",
    "3º Top 2": top8Thirds[1]?.team || "3º Mejor 2",
    "3º Top 3": top8Thirds[2]?.team || "3º Mejor 3",
    "3º Top 4": top8Thirds[3]?.team || "3º Mejor 4",
    "3º Top 5": top8Thirds[4]?.team || "3º Mejor 5",
    "3º Top 6": top8Thirds[5]?.team || "3º Mejor 6",
    "3º Top 7": top8Thirds[6]?.team || "3º Mejor 7",
    "3º Top 8": top8Thirds[7]?.team || "3º Mejor 8"
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
    advanceTeams[`3${g}`] = isCompleted ? (standings[g][2]?.team || `3º Grupo ${g}`) : `3º Grupo ${g}`;
  });
  
  const bracketTeams = {};
  const userMatches = {};
  
  const userR32Matches = [
    { id: "M73", label: "D1", lRef: "2A", vRef: "2B" },
    { id: "M74", label: "D2", lRef: "1C", vRef: "2F" },
    { id: "M75", label: "D3", lRef: "1E", vRef: "3D" },
    { id: "M76", label: "D4", lRef: "1I", vRef: "3F" },
    { id: "M77", label: "D5", lRef: "1F", vRef: "2C" },
    { id: "M78", label: "D6", lRef: "2E", vRef: "2I" },
    { id: "M79", label: "D7", lRef: "1A", vRef: "3E" },
    { id: "M80", label: "D8", lRef: "1L", vRef: "3K" },
    { id: "M81", label: "D9", lRef: "1G", vRef: "3I" },
    { id: "M82", label: "D10", lRef: "1D", vRef: "3B" },
    { id: "M83", label: "D11", lRef: "1H", vRef: "2J" },
    { id: "M84", label: "D12", lRef: "2K", vRef: "2L" },
    { id: "M85", label: "D13", lRef: "2D", vRef: "2G" },
    { id: "M86", label: "D14", lRef: "1J", vRef: "2H" },
    { id: "M87", label: "D15", lRef: "1K", vRef: "3L" },
    { id: "M88", label: "D16", lRef: "1B", vRef: "3J" }
  ];
  
  const realR32Matches = [
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

  const r32Matches = isReal ? realR32Matches : userR32Matches;
  
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

function calculateRealBracket(predObj, dbMatches) {
  return calculateUserBracket(predObj, dbMatches, true);
}

// Injects actual advancing team names into bracket matches in the list
function resolveActualKnockoutMatches(matchesList) {
  const officialPredObj = { matches: {}, specials: {} };
  matchesList.forEach(m => {
    officialPredObj.matches[m.id] = { gl: m.gl, gv: m.gv, pkl: m.pkl, pkv: m.pkv };
  });
  
  const actualBracket = calculateRealBracket(officialPredObj, matchesList);
  
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
  
  // 2. Score Knockout Stage matches (Robust Phase & Matchup Evaluation)
  const officialPredObj = { matches: {}, specials: {} };
  matchesList.forEach(m => {
    officialPredObj.matches[m.id] = { gl: m.gl, gv: m.gv, pkl: m.pkl, pkv: m.pkv };
  });
  
  const actualBracket = calculateRealBracket(officialPredObj, matchesList);
  const userBracket = calculateUserBracket(predObj, matchesList);
  
  const phases = {
    'Dieciseisavos': [],
    'Octavos': [],
    'Cuartos': [],
    'Semifinales': [],
    'Finales': []
  };
  
  matchesList.forEach(m => {
    if (m.phase !== 'Group Stage' && phases[m.phase]) {
      phases[m.phase].push(m.id);
    }
  });

  const knockoutMatches = matchesList.filter(m => m.phase !== 'Group Stage');
  
  knockoutMatches.forEach(m => {
    const mId = m.id;
    const act = actualBracket[mId];
    if (!act || !act.winner) return;
    
    const realWinner = act.winner;
    const realLocal = act.local;
    const realVisitor = act.visitor;
    
    const phaseMatchIds = phases[m.phase] || [mId];
    
    const userAdvancingTeamsInPhase = new Set();
    phaseMatchIds.forEach(id => {
      if (userBracket[id] && userBracket[id].winner) {
        userAdvancingTeamsInPhase.add(userBracket[id].winner);
      }
    });
    
    const hasPredictedAdvancement = userAdvancingTeamsInPhase.has(realWinner);
    
    let isExactScore = false;
    const pred = predObj.matches[mId];
    const usrMatch = userBracket[mId];
    
    if (m.gl !== null && m.gv !== null && m.gl !== '' && m.gv !== '' && pred && pred.gl !== '' && pred.gl !== undefined && pred.gl !== null && pred.gv !== '' && pred.gv !== undefined && pred.gv !== null) {
      const realGl = parseInt(m.gl);
      const realGv = parseInt(m.gv);
      const predGl = parseInt(pred.gl);
      const predGv = parseInt(pred.gv);
      
      const realPkl = m.pkl !== null && m.pkl !== undefined && m.pkl !== '' ? parseInt(m.pkl) : null;
      const realPkv = m.pkv !== null && m.pkv !== undefined && m.pkv !== '' ? parseInt(m.pkv) : null;
      const predPkl = pred.pkl !== null && pred.pkl !== undefined && pred.pkl !== '' ? parseInt(pred.pkl) : null;
      const predPkv = pred.pkv !== null && pred.pkv !== undefined && pred.pkv !== '' ? parseInt(pred.pkv) : null;
      
      const scoreMatches = (realGl === predGl && realGv === predGv) && (realGl !== realGv || (realPkl === predPkl && realPkv === predPkv));
      
      if (scoreMatches && usrMatch && ((usrMatch.local === realLocal && usrMatch.visitor === realVisitor) || (usrMatch.local === realVisitor && usrMatch.visitor === realLocal))) {
        isExactScore = true;
      }
    }
    
    if (isExactScore) {
      matchPoints += config.points.exact;
    } else if (hasPredictedAdvancement) {
      matchPoints += config.points.outcome;
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
      if (u.showInLeaderboard === false) return;
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

// Export full database backup (admin only)
app.get('/api/admin/export-database', requireAdmin, async (req, res) => {
  try {
    const db = await readDb();
    const exportData = {
      timestamp: new Date().toISOString(),
      config: db.config,
      users: db.users.map(u => ({
        id: u.id,
        username: u.username,
        isAdmin: !!u.isAdmin,
        showInLeaderboard: u.showInLeaderboard !== false,
        unlockOverrides: u.unlockOverrides || {}
      })),
      predictions: db.predictions,
      matches: db.matches,
      rankingHistory: db.rankingHistory
    };
    
    const dateStr = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=porra_mundial_backup_${dateStr}.json`);
    res.send(JSON.stringify(exportData, null, 2));
  } catch (err) {
    console.error("Error en /api/admin/export-database:", err);
    res.status(500).json({ error: "Error al exportar los datos." });
  }
});

// Get all users (admin only)
app.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const db = await readDb();
    const users = db.users.map(u => ({
      id: u.id,
      username: u.username,
      isAdmin: !!u.isAdmin,
      showInLeaderboard: u.showInLeaderboard !== false,
      unlockOverrides: u.unlockOverrides || {}
    }));
    res.json(users);
  } catch (err) {
    console.error("Error en /api/admin/users:", err);
    res.status(500).json({ error: "Error al recuperar los usuarios." });
  }
});

// Update user configuration (admin only)
app.post('/api/admin/users/:userId/config', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { showInLeaderboard, unlockOverrides } = req.body;
    
    const db = await readDb();
    const userIndex = db.users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }
    
    db.users[userIndex].showInLeaderboard = showInLeaderboard !== false;
    db.users[userIndex].unlockOverrides = {
      groups: (unlockOverrides && unlockOverrides.groups) || null,
      knockouts: (unlockOverrides && unlockOverrides.knockouts) || null,
      awards: (unlockOverrides && unlockOverrides.awards) || null
    };
    
    // Rebuild ranking history since leaderboard visibility might have changed
    rebuildRankingHistory(db);
    
    await writeDb(db);
    res.json({ message: "Ajustes de usuario actualizados con éxito." });
  } catch (err) {
    console.error("Error en /api/admin/users/:userId/config:", err);
    res.status(500).json({ error: "Error al actualizar la configuración de usuario." });
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

// Explicit chronological order map based on the real FIFA 2026 calendar.
// Group stage matches are ordered by actual play date/time as per the official schedule.
// Knockout stage matches follow their numeric match ID (M73-M104).
const MATCH_CHRONO_ORDER = {
  // === JORNADA 1 ===
  "M001": 1,  // 11 Jun - México vs. Sudáfrica (A)
  "M002": 2,  // 12 Jun - Corea del Sur vs. Rep. Checa (A)
  "M007": 3,  // 12 Jun - Canadá vs. Bosnia y Herzegovina (B)
  "M019": 4,  // 13 Jun - Estados Unidos vs. Paraguay (D)
  "M008": 5,  // 13 Jun - Catar vs. Suiza (B)
  "M013": 6,  // 14 Jun - Brasil vs. Marruecos (C)
  "M014": 7,  // 14 Jun - Haití vs. Escocia (C)
  "M020": 8,  // 14 Jun - Australia vs. Turquía (D)
  "M025": 9,  // 14 Jun - Alemania vs. Curazao (E)
  "M031": 10, // 14 Jun - Países Bajos vs. Japón (F)
  "M026": 11, // 15 Jun - Costa de Marfil vs. Ecuador (E)
  "M032": 12, // 15 Jun - Suecia vs. Túnez (F)
  "M043": 13, // 15 Jun - España vs. Cabo Verde (H)
  "M037": 14, // 15 Jun - Bélgica vs. Egipto (G)
  "M044": 15, // 16 Jun - Arabia Saudí vs. Uruguay (H)
  "M038": 16, // 16 Jun - Irán vs. Nueva Zelanda (G)
  "M049": 17, // 16 Jun - Francia vs. Senegal (I)
  "M050": 18, // 17 Jun - Noruega vs. Irak (I)
  "M055": 19, // 17 Jun - Argentina vs. Argelia (J)
  "M056": 20, // 17 Jun - Austria vs. Jordania (J)
  "M061": 21, // 17 Jun - Portugal vs. Rep. Dem. Congo (K)
  "M067": 22, // 17 Jun - Inglaterra vs. Croacia (L)
  "M068": 23, // 18 Jun - Ghana vs. Panamá (L)
  "M062": 24, // 18 Jun - Uzbekistán vs. Colombia (K)
  // === JORNADA 2 ===
  "M004": 25, // 18 Jun - Rep. Checa vs. Sudáfrica (A)
  "M010": 26, // 18 Jun - Bosnia y Herzegovina vs. Suiza (B)
  "M009": 27, // 19 Jun - Canadá vs. Catar (B)
  "M003": 28, // 19 Jun - México vs. Corea del Sur (A)
  "M021": 29, // 19 Jun - Estados Unidos vs. Australia (D)
  "M016": 30, // 20 Jun - Escocia vs. Marruecos (C)
  "M015": 31, // 20 Jun - Brasil vs. Haití (C)
  "M022": 32, // 20 Jun - Paraguay vs. Turquía (D)
  "M033": 33, // 20 Jun - Países Bajos vs. Suecia (F)
  "M027": 34, // 20 Jun - Alemania vs. Costa de Marfil (E)
  "M028": 35, // 21 Jun - Curazao vs. Ecuador (E)
  "M034": 36, // 21 Jun - Japón vs. Túnez (F)
  "M045": 37, // 21 Jun - España vs. Arabia Saudí (H)
  "M039": 38, // 21 Jun - Bélgica vs. Irán (G)
  "M046": 39, // 22 Jun - Cabo Verde vs. Uruguay (H)
  "M040": 40, // 22 Jun - Egipto vs. Nueva Zelanda (G)
  "M053": 41, // 22 Jun - Francia vs. Irak (I)
  "M054": 42, // 23 Jun - Noruega vs. Senegal (I)
  "M058": 43, // 23 Jun - Argelia vs. Jordania (J)
  "M057": 44, // 23 Jun - Argentina vs. Austria (J)
  "M063": 45, // 23 Jun - Portugal vs. Uzbekistán (K)
  "M064": 46, // 23 Jun - RD Congo vs. Colombia (K)
  "M069": 47, // 23 Jun - Inglaterra vs. Ghana (L)
  "M070": 48, // 24 Jun - Croacia vs. Panamá (L)
  // === JORNADA 3 ===
  "M012": 49, // 24 Jun - Bosnia y Herzegovina vs. Catar (B)
  "M017": 50, // 24 Jun - Escocia vs. Brasil (C)
  "M018": 51, // 25 Jun - Marruecos vs. Haití (C)
  "M005": 52, // 25 Jun - Rep. Checa vs. México (A)
  "M006": 53, // 25 Jun - Sudáfrica vs. Corea del Sur (A)
  "M029": 54, // 25 Jun - Ecuador vs. Alemania (E)
  "M030": 55, // 25 Jun - Curazao vs. Costa de Marfil (E)
  "M035": 56, // 25 Jun - Túnez vs. Países Bajos (F)
  "M036": 57, // 25 Jun - Japón vs. Suecia (F)
  "M011": 58, // 25 Jun - Suiza vs. Canadá (B)
  "M023": 59, // 26 Jun - Turquía vs. Estados Unidos (D)
  "M024": 60, // 26 Jun - Paraguay vs. Australia (D)
  "M042": 61, // 26 Jun - Egipto vs. Irán (G)
  "M041": 62, // 26 Jun - Nueva Zelanda vs. Bélgica (G)
  "M048": 63, // 26 Jun - Cabo Verde vs. Arabia Saudí (H)
  "M047": 64, // 26 Jun - Uruguay vs. España (H)
  "M052": 65, // 27 Jun - Senegal vs. Irak (I)
  "M051": 66, // 27 Jun - Noruega vs. Francia (I)
  "M060": 67, // 27 Jun - Argelia vs. Austria (J)
  "M059": 68, // 27 Jun - Jordania vs. Argentina (J)
  "M066": 69, // 27 Jun - RD Congo vs. Uzbekistán (K)
  "M065": 70, // 27 Jun - Colombia vs. Portugal (K)
  "M072": 71, // 28 Jun - Croacia vs. Ghana (L)
  "M071": 72, // 28 Jun - Panamá vs. Inglaterra (L)
};

// Chronological sort function for matches using the real FIFA 2026 calendar order
function compareMatchesChronologically(mA, mB) {
  const isGroupA = mA.phase === 'Group Stage';
  const isGroupB = mB.phase === 'Group Stage';
  
  if (isGroupA && !isGroupB) return -1;
  if (!isGroupA && isGroupB) return 1;
  
  if (isGroupA && isGroupB) {
    const orderA = MATCH_CHRONO_ORDER[mA.id] !== undefined ? MATCH_CHRONO_ORDER[mA.id] : 999;
    const orderB = MATCH_CHRONO_ORDER[mB.id] !== undefined ? MATCH_CHRONO_ORDER[mB.id] : 999;
    return orderA - orderB;
  } else {
    // Knockout: sort by numeric match ID
    const numA = parseInt(mA.id.replace('M', ''));
    const numB = parseInt(mB.id.replace('M', ''));
    return numA - numB;
  }
}

// Rebuilds entire rankingHistory based on chronological order of played matches
function rebuildRankingHistory(db) {
  const sortedMatches = [...db.matches].sort(compareMatchesChronologically);
  const completed = sortedMatches.filter(m => m.gl !== null && m.gv !== null);
  
  const history = [];
  
  for (let i = 0; i < completed.length; i++) {
    const targetMatch = completed[i];
    
    // Create matches snapshot up to this targetMatch chronologically
    const matchesUpToTarget = db.matches.map(m => {
      const isAfter = compareMatchesChronologically(m, targetMatch) > 0;
      if (isAfter) {
        return { ...m, gl: null, gv: null, pkl: null, pkv: null };
      }
      return m;
    });
    
    const userStandings = [];
    db.users.forEach(u => {
      if (u.isAdmin && u.username !== "Sergio B") return;
      if (u.showInLeaderboard === false) return; // Skip users hidden from leaderboard
      const predObj = db.predictions[u.id] || { matches: {}, specials: {} };
      const score = calculateParticipantScore(predObj, matchesUpToTarget, db.config, db.config.winners);
      userStandings.push({
        username: u.username,
        points: score.total,
        matchPoints: score.matchPoints,
        totalSpecials: score.totalSpecials
      });
    });
    
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
    
    history.push({
      matchId: targetMatch.id,
      timestamp: Date.now(),
      ranks: ranks,
      points: pointsMap
    });
  }
  
  db.rankingHistory = history;
}

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
    
    // Recalculate and rebuild full ranking history
    rebuildRankingHistory(db);
    
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

// Initialize database, rebuild ranking history if needed, and start listening
dbConnector.initDb().then(async () => {
  try {
    const db = await readDb();
    rebuildRankingHistory(db);
    await writeDb(db);
    console.log('🔄 [DB] Ranking history rebuilt on startup.');
  } catch (startupErr) {
    console.error('⚠️ [Startup] Could not rebuild ranking history on startup:', startupErr);
  }

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
