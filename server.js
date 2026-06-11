const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = "porrasupersecretkey2026";
const DEADLINE = new Date("2026-06-13T21:00:00+02:00"); // Sat, Jun 13, 2026, 9:00 PM GMT+2

app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Database helper functions (atomic writes)
const DB_FILE = path.join(__dirname, 'data.json');

function readDb() {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading database file:", err);
    return { config: {}, users: [], predictions: {}, matches: [], rankingHistory: [] };
  }
}

function writeDb(data) {
  try {
    const tempFile = DB_FILE + '.tmp';
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error("Error writing database file:", err);
  }
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
  const { username, password } = req.body;
  if (!username || !password || username.trim() === "" || password.trim() === "") {
    return res.status(400).json({ error: "Usuario y contraseña son requeridos." });
  }
  
  const db = readDb();
  const lowerUsername = username.toLowerCase().trim();
  
  const userExists = db.users.some(u => u.username.toLowerCase() === lowerUsername);
  if (userExists) {
    return res.status(400).json({ error: "El nombre de usuario ya está registrado." });
  }
  
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(password, salt);
  const userId = "user_" + Date.now();
  
  const newUser = {
    id: userId,
    username: username.trim(),
    passwordHash: passwordHash,
    salt: salt,
    isAdmin: false
  };
  
  db.users.push(newUser);
  // Initialize predictions template
  db.predictions[userId] = { matches: {}, specials: { balon_oro: "", balon_plata: "", balon_bronce: "", bota_oro: "", bota_plata: "", bota_bronce: "" } };
  writeDb(db);
  
  const token = jwt.sign({ id: userId, username: newUser.username, isAdmin: false }, JWT_SECRET, { expiresIn: '7d' });
  res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.json({ message: "Usuario registrado con éxito.", user: { id: userId, username: newUser.username, isAdmin: false } });
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Usuario y contraseña son requeridos." });
  }
  
  const db = readDb();
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
app.get('/api/matches', (req, res) => {
  const db = readDb();
  res.json(db.matches);
});

// Get user predictions (only allowed for authenticated owner, or admin)
app.get('/api/predictions/:userId', authenticateToken, (req, res) => {
  const { userId } = req.params;
  if (req.user.id !== userId && !req.user.isAdmin) {
    return res.status(403).json({ error: "No tienes permiso para ver estas predicciones." });
  }
  
  const db = readDb();
  const userPred = db.predictions[userId] || { matches: {}, specials: {} };
  res.json(userPred);
});

// Submit/Update user predictions
app.post('/api/predictions/:userId', authenticateToken, (req, res) => {
  const { userId } = req.params;
  if (req.user.id !== userId) {
    return res.status(403).json({ error: "No tienes permiso para editar estas predicciones." });
  }
  
  if (isDeadlinePassed()) {
    return res.status(403).json({ error: "La fecha límite para enviar o modificar predicciones ha expirado (Sábado 13/06/2026 21:00)." });
  }
  
  const { matches, specials } = req.body;
  if (!matches || !specials) {
    return res.status(400).json({ error: "Datos de predicción incorrectos." });
  }
  
  const db = readDb();
  
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
  
  writeDb(db);
  res.json({ message: "Predicciones guardadas correctamente." });
});

// Get predictions of ALL participants (only allowed AFTER deadline, or for admin)
app.get('/api/predictions-master', authenticateToken, (req, res) => {
  if (!isDeadlinePassed() && !req.user.isAdmin) {
    return res.status(403).json({ error: "Las predicciones de otros participantes estarán bloqueadas hasta el cierre de la fecha límite." });
  }
  
  const db = readDb();
  // Map predictions to user names
  const result = {};
  for (const userId in db.predictions) {
    const userObj = db.users.find(u => u.id === userId);
    if (userObj && !userObj.isAdmin) {
      result[userObj.username] = db.predictions[userId];
    }
  }
  res.json(result);
});

// ==============================================================================
// LEADERBOARD AND DASHBOARD API
// ==============================================================================

// Helper: Calculate participant score
function calculateParticipantScore(predObj, matchesList, config, winners) {
  let matchPoints = 0;
  
  // Iterate through all matches that have official results
  matchesList.forEach(m => {
    if (m.gl !== null && m.gv !== null && m.gl !== "" && m.gv !== "") {
      const pred = predObj.matches[m.id];
      if (pred && pred.gl !== undefined && pred.gv !== undefined && pred.gl !== null && pred.gv !== null && pred.gl !== "" && pred.gv !== "") {
        const realGl = parseInt(m.gl);
        const realGv = parseInt(m.gv);
        const predGl = parseInt(pred.gl);
        const predGv = parseInt(pred.gv);
        
        const isExact = (realGl === predGl) && (realGv === predGv);
        
        // Outcome check using sign
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
  
  // Trofeos Especiales points
  let balonOroPts = (winners.balon_oro && predObj.specials.balon_oro === winners.balon_oro) ? config.points.balon_oro : 0;
  let balonPlataPts = (winners.balon_plata && predObj.specials.balon_plata === winners.balon_plata) ? config.points.balon_plata : 0;
  let balonBroncePts = (winners.balon_bronce && predObj.specials.balon_bronce === winners.balon_bronce) ? config.points.balon_bronce : 0;
  let botaOroPts = (winners.bota_oro && predObj.specials.bota_oro === winners.bota_oro) ? config.points.bota_oro : 0;
  let botaPlataPts = (winners.bota_plata && predObj.specials.bota_plata === winners.bota_plata) ? config.points.bota_plata : 0;
  let botaBroncePts = (winners.bota_bronce && predObj.specials.bota_bronce === winners.bota_bronce) ? config.points.bota_bronce : 0;
  
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
app.get('/api/leaderboard', (req, res) => {
  const db = readDb();
  const list = [];
  
  db.users.forEach(u => {
    if (u.isAdmin) return;
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
  
  // Add ranks
  let currentRank = 0;
  let currentPoints = -1;
  list.forEach((p, idx) => {
    if (p.total !== currentPoints) {
      currentRank = idx + 1;
      currentPoints = p.total;
    }
    p.rank = currentRank;
  });
  
  res.json({
    leaderboard: list,
    config: db.config,
    rankingHistory: db.rankingHistory
  });
});

// ==============================================================================
// ADMIN MANAGEMENT API
// ==============================================================================

// Get admin status of database (for display in admin view)
app.get('/api/admin/dashboard', requireAdmin, (req, res) => {
  const db = readDb();
  res.json({
    config: db.config,
    usersCount: db.users.filter(u => !u.isAdmin).length,
    predictionsCount: Object.keys(db.predictions).length,
    matches: db.matches
  });
});

// Update Point Settings
app.post('/api/admin/config-points', requireAdmin, (req, res) => {
  const { points } = req.body;
  if (!points) {
    return res.status(400).json({ error: "Settings missing." });
  }
  
  const db = readDb();
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
  
  writeDb(db);
  res.json({ message: "Configuración de puntos actualizada.", config: db.config });
});

// Update Official Award Winners
app.post('/api/admin/config-winners', requireAdmin, (req, res) => {
  const { winners } = req.body;
  if (!winners) {
    return res.status(400).json({ error: "Winners missing." });
  }
  
  const db = readDb();
  db.config.winners = {
    balon_oro: winners.balon_oro || "",
    balon_plata: winners.balon_plata || "",
    balon_bronce: winners.balon_bronce || "",
    bota_oro: winners.bota_oro || "",
    bota_plata: winners.bota_plata || "",
    bota_bronce: winners.bota_bronce || ""
  };
  
  writeDb(db);
  res.json({ message: "Ganadores oficiales actualizados.", config: db.config });
});

// Change Admin Password
app.post('/api/admin/change-password', requireAdmin, (req, res) => {
  const { password } = req.body;
  if (!password || password.trim() === "" || password.length < 6) {
    return res.status(400).json({ error: "Contraseña inválida. Debe tener al menos 6 caracteres." });
  }
  
  const db = readDb();
  const adminUser = db.users.find(u => u.isAdmin);
  if (!adminUser) {
    return res.status(404).json({ error: "Usuario administrador no encontrado." });
  }
  
  const salt = crypto.randomBytes(16).toString('hex');
  adminUser.salt = salt;
  adminUser.passwordHash = hashPassword(password, salt);
  
  writeDb(db);
  res.json({ message: "Contraseña de administrador actualizada con éxito." });
});

// Update Match Results (and auto-calculate ranking evolution)
app.post('/api/admin/matches/:matchId', requireAdmin, (req, res) => {
  const { matchId } = req.params;
  const { gl, gv, pkl, pkv } = req.body;
  
  const db = readDb();
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
    
    // Compile points up to this match for all users
    const userStandings = [];
    db.users.forEach(u => {
      if (u.isAdmin) return;
      const predObj = db.predictions[u.id] || { matches: {}, specials: {} };
      
      // Calculate scores but ONLY for matches that have results, excluding specials
      let matchPoints = 0;
      db.matches.forEach(m => {
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
              matchPoints += db.config.points.exact;
            } else if (isOutcome) {
              matchPoints += db.config.points.outcome;
            }
          }
        }
      });
      
      userStandings.push({
        username: u.username,
        points: matchPoints
      });
    });
    
    // Sort and assign ranks
    userStandings.sort((a, b) => b.points - a.points || a.username.localeCompare(b.username));
    
    let currentRank = 0;
    let currentPoints = -1;
    const ranks = {};
    userStandings.forEach((p, idx) => {
      if (p.points !== currentPoints) {
        currentRank = idx + 1;
        currentPoints = p.points;
      }
      ranks[p.username] = currentRank;
    });
    
    // Add snapshot record
    db.rankingHistory.push({
      matchId: matchId,
      timestamp: Date.now(),
      ranks: ranks
    });
    
    // Sort history by match ID order
    // Order matches by their index in db.matches
    db.rankingHistory.sort((a, b) => {
      const idxA = db.matches.findIndex(m => m.id === a.matchId);
      const idxB = db.matches.findIndex(m => m.id === b.matchId);
      return idxA - idxB;
    });
  } else {
    // If goals were cleared, delete snapshot for this match
    db.rankingHistory = db.rankingHistory.filter(h => h.matchId !== matchId);
  }
  
  writeDb(db);
  res.json({ message: "Resultado del partido guardado con éxito.", match: db.matches[matchIndex] });
});

// Serve frontend routing fallback
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n=============================================================`);
  console.log(`⚽ PORRA MUNDIAL 2026 SERVER RUNNING AT: http://localhost:${PORT}`);
  console.log(`🔒 Prediction Deadline: ${DEADLINE.toLocaleString()}`);
  console.log(`=============================================================\n`);
});
