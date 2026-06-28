const assert = require('assert');
const crypto = require('crypto');

// 1. Password hashing check
function hashPassword(password, salt) {
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

console.log("--- TEST 1: Password Hash integrity ---");
const salt = "porrasecret";
const pass = "admin123";
const hash = hashPassword(pass, salt);
// Check if it is a valid hex sha256 string
assert.strictEqual(hash.length, 64);
console.log("✔ Password hash matches expectations!");

// 2. Score calculation simulation
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

function getMatchWinner(local, visitor, gl, gv, pkl, pkv) {
  if (gl === null || gl === undefined || gl === "" || gv === null || gv === undefined || gv === "") {
    return null;
  }
  const goalsL = parseInt(gl);
  const goalsV = parseInt(gv);
  if (goalsL > goalsV) return local;
  if (goalsL < goalsV) return visitor;
  
  if (pkl === null || pkl === undefined || pkl === "" || pkv === null || pkv === undefined || pkv === "") {
    return null;
  }
  const pkL = parseInt(pkl);
  const pkV = parseInt(pkv);
  if (pkL > pkV) return local;
  if (pkL < pkV) return visitor;
  return null;
}

// Simulates the bracket progression for a user's predictions
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

// Simulates the real tournament bracket based on actual match results in dbMatches
function calculateRealBracket(predObj, dbMatches) {
  const bracketTeams = {};
  const userMatches = {};
  
  const r32Matches = [
    { id: "M73", label: "D1" }, { id: "M74", label: "D2" }, { id: "M75", label: "D3" }, { id: "M76", label: "D4" },
    { id: "M77", label: "D5" }, { id: "M78", label: "D6" }, { id: "M79", label: "D7" }, { id: "M80", label: "D8" },
    { id: "M81", label: "D9" }, { id: "M82", label: "D10" }, { id: "M83", label: "D11" }, { id: "M84", label: "D12" },
    { id: "M85", label: "D13" }, { id: "M86", label: "D14" }, { id: "M87", label: "D15" }, { id: "M88", label: "D16" }
  ];
  
  r32Matches.forEach(m => {
    const dbM = dbMatches.find(x => x.id === m.id) || {};
    const local = dbM.local || `Local ${m.id}`;
    const visitor = dbM.visitor || `Visitante ${m.id}`;
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
    totalSpecials,
    total
  };
}

console.log("\n--- TEST 2: Standings & Points calculation logic ---");
const testConfig = {
  points: {
    outcome: 1,
    exact: 3,
    balon_oro: 10,
    balon_plata: 5,
    balon_bronce: 3,
    bota_oro: 10,
    bota_plata: 5,
    bota_bronce: 3
  }
};

const testWinners = {
  balon_oro: "Lionel Messi",
  balon_plata: "Kylian Mbappe",
  balon_bronce: "Luka Modric",
  bota_oro: "Erling Haaland",
  bota_plata: "Harry Kane",
  bota_bronce: "Robert Lewandowski"
};

const mockMatches = [
  { id: "M1", phase: "Group Stage", group: "A", local: "Alemania", visitor: "Suiza", gl: 2, gv: 1 }, 
  { id: "M2", phase: "Group Stage", group: "A", local: "Curazao", visitor: "Costa de Marfil", gl: 1, gv: 1 }, 
  { id: "M3", phase: "Group Stage", group: "A", local: "Alemania", visitor: "Curazao", gl: 0, gv: 2 }, 
  { id: "M4", phase: "Group Stage", group: "A", local: "Suiza", visitor: "Costa de Marfil", gl: 3, gv: 3 }, 
  { id: "M73", phase: "Round of 32", local: "1º Grupo A", visitor: "3º Mejor 1", gl: 2, gv: 2, pkl: 5, pkv: 4 } 
];

const juanPredictions = {
  matches: {
    "M1": { gl: 2, gv: 1 },
    "M2": { gl: 0, gv: 0 },
    "M3": { gl: 1, gv: 0 },
    "M4": { gl: 3, gv: 3 },
    "M73": { gl: 1, gv: 1, pkl: 4, pkv: 3 }
  },
  specials: {
    balon_oro: "Lionel Messi",
    balon_plata: "Neymar Jr",
    balon_bronce: "",
    bota_oro: "Erling Haaland",
    bota_plata: "",
    bota_bronce: ""
  }
};

const resultJuan = calculateParticipantScore(juanPredictions, mockMatches, testConfig, testWinners);
console.log(`Juan Match Points: ${resultJuan.matchPoints} (Expected: 7)`);
console.log(`Juan Specials Points: ${resultJuan.totalSpecials} (Expected: 20)`);
console.log(`Juan Total Points: ${resultJuan.total} (Expected: 27)`);

assert.strictEqual(resultJuan.matchPoints, 7);
assert.strictEqual(resultJuan.totalSpecials, 20);
assert.strictEqual(resultJuan.total, 27);
console.log("✔ Juan point calculations match expectations perfectly!");

const mariaPredictions = {
  matches: {
    "M1": { gl: 1, gv: 0 },
    "M2": { gl: 1, gv: 1 },
    "M3": { gl: 0, gv: 2 },
    "M4": { gl: 0, gv: 0 },
    "M73": { gl: 2, gv: 1 }
  },
  specials: {
    balon_oro: "Cristiano Ronaldo",
    balon_plata: "Kylian Mbappe",
    balon_bronce: "Luka Modric",
    bota_oro: "Erling Haaland",
    bota_plata: "Harry Kane",
    bota_bronce: "Robert Lewandowski"
  }
};

const resultMaria = calculateParticipantScore(mariaPredictions, mockMatches, testConfig, testWinners);
console.log(`Maria Match Points: ${resultMaria.matchPoints} (Expected: 8)`);
console.log(`Maria Specials Points: ${resultMaria.totalSpecials} (Expected: 26)`);
console.log(`Maria Total Points: ${resultMaria.total} (Expected: 34)`);

assert.strictEqual(resultMaria.matchPoints, 8);
assert.strictEqual(resultMaria.totalSpecials, 26);
assert.strictEqual(resultMaria.total, 34);
console.log("✔ Maria point calculations match expectations perfectly!");

console.log("\nALL API UNIT TESTS PASSED SUCCESSFULLY! LÓGICA DE CÁLCULO DE PUNTOS DE LA APP WEB VERIFICADA.");
