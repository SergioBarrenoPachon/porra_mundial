// Team Rankings and Flag CDN codes for all 48 teams
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

function getFlagImgHtml(teamName) {
  const data = TEAM_DATA[teamName];
  if (!data || !data.flag) return '🏳️';
  return `<img src="https://flagcdn.com/w40/${data.flag.toLowerCase()}.png" class="flag-img" alt="${teamName}" style="width: 20px; height: 13px; margin-right: 4px; vertical-align: middle;">`;
}

let currentUser = null;
let allMatches = [];
let leaderboardData = [];
let rankingHistory = [];
let masterPredictions = null;
let evolutionChart = null;

// Palette of colors for the evolution chart lines
const LINE_COLORS = [
  '#00B5AD', '#2185D0', '#E03997', '#FBBF24', '#38A169', 
  '#E53E3E', '#805AD5', '#ED64A6', '#319795', '#D69E2E',
  '#718096', '#ED8936', '#48BB78', '#38B2AC', '#4299E1',
  '#667EEA', '#9F7AEA', '#ED64A6', '#E53E3E', '#ECC94B'
];

document.addEventListener("DOMContentLoaded", async () => {
  await verifySession();
  await loadMatches();
  await loadLeaderboard();
  await loadMasterPredictions();
});

async function verifySession() {
  const res = await fetch('/api/auth/me');
  const data = await res.json();
  if (data.user) {
    currentUser = data.user;
    document.getElementById('user-greeting').innerText = `¡Hola, ${currentUser.username}!`;
    if (currentUser.isAdmin) {
      document.getElementById('admin-nav-link').style.display = 'inline-block';
    }
  }
}

async function loadMatches() {
  const res = await fetch('/api/matches');
  allMatches = await res.json();
}

async function loadLeaderboard() {
  try {
    const res = await fetch('/api/leaderboard');
    const data = await res.json();
    leaderboardData = data.leaderboard;
    rankingHistory = data.rankingHistory || [];
    
    renderLeaderboard();
    renderChart();
  } catch (err) {
    console.error("Error loading leaderboard:", err);
    showToast("Error al cargar la clasificación.", true);
  }
}

async function loadMasterPredictions() {
  try {
    const deadlineRes = await fetch('/api/predictions/deadline');
    const deadlineData = await deadlineRes.json();
    
    // Block comparison matrix completely before the deadline (except for administrators)
    const showBlocked = !deadlineData.isPassed && (!currentUser || !currentUser.isAdmin);
    
    if (showBlocked) {
      document.getElementById('matrix-table-wrapper').style.display = 'none';
      document.getElementById('search-matrix').style.display = 'none';
      document.getElementById('matrix-blocked-container').style.display = 'block';
      document.getElementById('matrix-lock-notice').style.display = 'none';
      return;
    }
    
    const res = await fetch('/api/predictions-master');
    if (res.ok) {
      masterPredictions = await res.json();
      document.getElementById('matrix-lock-notice').innerText = "✅ Los pronósticos de todos los participantes ya están visibles.";
      document.getElementById('matrix-table-wrapper').style.display = 'block';
      document.getElementById('search-matrix').style.display = 'block';
      document.getElementById('matrix-blocked-container').style.display = 'none';
      renderMatrixTable();
    } else {
      document.getElementById('matrix-table-wrapper').style.display = 'none';
      document.getElementById('search-matrix').style.display = 'none';
      document.getElementById('matrix-blocked-container').style.display = 'block';
      document.getElementById('matrix-lock-notice').style.display = 'none';
    }
  } catch (err) {
    console.error("Error loading master predictions:", err);
  }
}

// Render Leaderboard (Podium & List Layout)
function renderLeaderboard() {
  const container = document.getElementById('leaderboard-card-content');
  if (!container) return;
  
  if (leaderboardData.length === 0) {
    container.innerHTML = `<div style="color: var(--color-text-muted); padding: 30px; text-align: center;">No hay participantes registrados.</div>`;
    return;
  }
  
  // Find top 3 players
  const top1 = leaderboardData.find(p => p.rank === 1);
  const top2 = leaderboardData.find(p => p.rank === 2);
  const top3 = leaderboardData.find(p => p.rank === 3);
  
  // Max score to calculate relative width of progress bars
  const maxScore = Math.max(1, leaderboardData[0]?.total || 0);
  
  let podiumHtml = '';
  if (top1 || top2 || top3) {
    podiumHtml += `<div class="podium-container">`;
    
    // 2nd Place
    if (top2) {
      const isMe = currentUser && currentUser.username === top2.username;
      const highlightBorder = isMe ? 'style="border-color: var(--accent-gold);"' : '';
      podiumHtml += `
        <div class="podium-step second" ${highlightBorder}>
          <div class="podium-badge">🥈</div>
          <div class="podium-name" title="${top2.username}">${top2.username} ${isMe ? '(Tú)' : ''}</div>
          <div class="podium-pts">${top2.total} pts</div>
        </div>
      `;
    } else {
      podiumHtml += `<div class="podium-step second" style="opacity: 0.3; border-style: dashed;"><div class="podium-badge">🥈</div></div>`;
    }
    
    // 1st Place
    if (top1) {
      const isMe = currentUser && currentUser.username === top1.username;
      const highlightBorder = isMe ? 'style="border-color: var(--primary);"' : '';
      podiumHtml += `
        <div class="podium-step first" ${highlightBorder}>
          <div class="podium-badge" style="filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.4));">👑</div>
          <div class="podium-name" title="${top1.username}" style="color: var(--accent-gold); font-size: 0.95rem;">${top1.username} ${isMe ? '(Tú)' : ''}</div>
          <div class="podium-pts">${top1.total} pts</div>
        </div>
      `;
    } else {
      podiumHtml += `<div class="podium-step first" style="opacity: 0.3; border-style: dashed;"><div class="podium-badge">🥇</div></div>`;
    }
    
    // 3rd Place
    if (top3) {
      const isMe = currentUser && currentUser.username === top3.username;
      const highlightBorder = isMe ? 'style="border-color: var(--accent-gold);"' : '';
      podiumHtml += `
        <div class="podium-step third" ${highlightBorder}>
          <div class="podium-badge">🥉</div>
          <div class="podium-name" title="${top3.username}">${top3.username} ${isMe ? '(Tú)' : ''}</div>
          <div class="podium-pts">${top3.total} pts</div>
        </div>
      `;
    } else {
      podiumHtml += `<div class="podium-step third" style="opacity: 0.3; border-style: dashed;"><div class="podium-badge">🥉</div></div>`;
    }
    
    podiumHtml += `</div>`;
  }
  
  // List of all players
  let listHtml = `<div class="leaderboard-list">`;
  
  leaderboardData.forEach((p, idx) => {
    const isMe = currentUser && currentUser.username === p.username;
    const initial = p.username.charAt(0);
    const progressPercent = Math.min(100, Math.max(5, (p.total / maxScore) * 100));
    
    let avatarStyle = '';
    let rankClass = '';
    if (p.rank === 1) {
      avatarStyle = 'style="background: var(--accent-gold); color: #000; font-weight: 800;"';
      rankClass = 'rank-first';
    } else if (p.rank === 2) {
      avatarStyle = 'style="background: hsl(0, 0%, 75%); color: #000;"';
      rankClass = 'rank-second';
    } else if (p.rank === 3) {
      avatarStyle = 'style="background: hsl(20, 60%, 55%);"';
      rankClass = 'rank-third';
    }
    
    listHtml += `
      <div class="leaderboard-item ${isMe ? 'is-me' : ''} ${rankClass}">
        <div class="item-rank">#${p.rank}</div>
        <div class="item-avatar" ${avatarStyle}>${initial}</div>
        <div class="item-info">
          <div class="item-name-wrapper">
            <span class="item-username">${p.username}</span>
            ${isMe ? '<span class="item-me-tag">Tú</span>' : ''}
          </div>
          <div class="item-points-bar-container">
            <div class="item-points-bar" style="width: ${progressPercent}%;"></div>
          </div>
        </div>
        <div class="item-score-pills">
          <div class="score-pill">⚽ ${p.matchPoints} pts</div>
          <div class="score-pill">🏆 ${p.totalSpecials} pts</div>
          <div class="score-pill total">${p.total} pts</div>
        </div>
      </div>
    `;
  });
  
  listHtml += `</div>`;
  container.innerHTML = podiumHtml + listHtml;
}

// Render ranking evolution chart (Chart.js)
const TEAM_ACRONYMS = {
  "Argentina": "ARG", "Francia": "FRA", "Espana": "ESP", "Inglaterra": "ENG",
  "Brasil": "BRA", "Belgica": "BEL", "Paises Bajos": "NED", "Portugal": "POR",
  "Alemania": "GER", "Croacia": "CRO", "Marruecos": "MAR", "Colombia": "COL",
  "Uruguay": "URU", "Suiza": "SUI", "Estados Unidos": "USA", "Mexico": "MEX",
  "Japon": "JPN", "Senegal": "SEN", "Corea del Sur": "KOR", "Iran": "IRN",
  "Austria": "AUT", "Suecia": "SWE", "Australia": "AUS", "Rep. Checa": "CZE",
  "Egipto": "EGY", "Costa de Marfil": "CIV", "Escocia": "SCO", "Canada": "CAN",
  "Tunez": "TUN", "Panama": "PAN", "Argelia": "ALG", "Noruega": "NOR",
  "Saudi Arabia": "KSA", "Arabia Saudi": "KSA", "Ecuador": "ECU", "Turquia": "TUR",
  "Uzbekistan": "UZB", "RD Congo": "COD", "Cabo Verde": "CPV", "Paraguay": "PAR",
  "Irak": "IRQ", "Jordania": "JOR", "Uzbekistán": "UZB", "Bosnia y Herzegovina": "BIH",
  "Catar": "QAT", "Qatar": "QAT", "Ghana": "GHA", "Haiti": "HAI",
  "Nueva Zelanda": "NZL", "Sudafrica": "RSA", "Curazao": "CUW"
};

function getFlagEmoji(countryCode) {
  if (!countryCode) return '';
  const code = countryCode.toLowerCase();
  if (code === 'gb-sct') return '🏴󠁧󠁢󠁳󠁣󠁴󠁿';
  if (code === 'gb-eng') return '🏴󠁧󠁢󠁥󠁮󠁧󠁿';
  if (code.includes('-')) {
    return getFlagEmoji(code.split('-')[0]);
  }
  const codePoints = code
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

function getTeamAcronym(teamName) {
  if (!teamName) return '';
  if (TEAM_ACRONYMS[teamName]) return TEAM_ACRONYMS[teamName];
  const clean = teamName.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return clean.substring(0, 3).toUpperCase();
}

function renderChart() {
  const ctx = document.getElementById('evolutionChart').getContext('2d');
  
  if (rankingHistory.length === 0) {
    ctx.font = "14px Segoe UI";
    ctx.fillStyle = "#a0aec0";
    ctx.textAlign = "center";
    ctx.fillText("No hay partidos jugados todavía para registrar evolución.", 150, 100);
    return;
  }
  
  // X-Axis labels: Banderas + Siglas de los equipos en vez de ID de partido
  const labels = rankingHistory.map(h => {
    const m = allMatches.find(x => x.id === h.matchId);
    if (m) {
      const locFlag = TEAM_DATA[m.local]?.flag ? getFlagEmoji(TEAM_DATA[m.local].flag) : '';
      const visFlag = TEAM_DATA[m.visitor]?.flag ? getFlagEmoji(TEAM_DATA[m.visitor].flag) : '';
      const locAcr = getTeamAcronym(m.local);
      const visAcr = getTeamAcronym(m.visitor);
      return `${locFlag}${locAcr} - ${visFlag}${visAcr}`;
    }
    return h.matchId;
  });
  
  // Collect all unique participant usernames
  const participants = [];
  leaderboardData.forEach(p => participants.push(p.username));
  
  // Build datasets
  const datasets = participants.map((username, idx) => {
    const dataPoints = rankingHistory.map(h => {
      return h.ranks[username] || null; // Returns their rank, or null if not registered at that time
    });
    
    const color = LINE_COLORS[idx % LINE_COLORS.length];
    
    return {
      label: username,
      data: dataPoints,
      borderColor: color,
      backgroundColor: color,
      fill: false,
      tension: 0.15,
      borderWidth: username === (currentUser?.username) ? 4 : 2,
      pointRadius: username === (currentUser?.username) ? 5 : 3,
      spanGaps: true
    };
  });
  
  if (evolutionChart) evolutionChart.destroy();
  
  evolutionChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: '#cbd5e0',
            font: { family: 'Segoe UI', size: 10 }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: Puesto #${context.raw}`;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#718096' },
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        },
        y: {
          reverse: true, // Rank 1 is at the top!
          min: 1,
          max: Math.max(1, participants.length), // Estrictamente limitado por el número de participantes
          ticks: {
            color: '#718096',
            stepSize: 1,
            precision: 0,
            callback: function(value) {
              if (Number.isInteger(value)) return '#' + value;
              return '';
            }
          },
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        }
      }
    }
  });
}

// Helper to calculate match winner on client
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

// Simulates user predictions bracket on client
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

// Render Match Comparison Matrix Table
function renderMatrixTable() {
  const thead = document.getElementById('matrix-head');
  const tbody = document.getElementById('matrix-body');
  
  if (!masterPredictions) {
    tbody.innerHTML = `<tr><td colspan="4" style="color: var(--color-text-muted); padding: 30px;">Cargando predicciones...</td></tr>`;
    return;
  }
  
  const participants = Object.keys(masterPredictions).sort();
  
  // Cache user predictions brackets
  const userBrackets = {};
  participants.forEach(p => {
    userBrackets[p] = calculateUserBracket(masterPredictions[p], allMatches);
  });
  
  // Calculate actual official bracket
  const officialPredObj = { matches: {}, specials: {} };
  allMatches.forEach(m => {
    officialPredObj.matches[m.id] = { gl: m.gl, gv: m.gv, pkl: m.pkl, pkv: m.pkv };
  });
  const actualBracket = calculateUserBracket(officialPredObj, allMatches);
  
  // Render Head Headers
  let headHtml = `
    <tr class="header-row">
      <th style="text-align: left;">Partido</th>
      <th>Fase</th>
      <th>Resultado Real</th>
  `;
  
  participants.forEach(p => {
    headHtml += `<th>${p}</th>`;
  });
  headHtml += '</tr>';
  thead.innerHTML = headHtml;
  
  // Render Body Rows
  let bodyHtml = '';
  
  allMatches.forEach(m => {
    // Determine real outcome score
    const hasRealResult = m.gl !== null && m.gv !== null;
    const realScoreStr = hasRealResult ? `${m.gl} - ${m.gv}${m.pkl !== null ? ` (PK ${m.pkl}-${m.pkv})` : ''}` : 'Pendiente';
    
    bodyHtml += `
      <tr class="matrix-row-item">
        <td style="text-align: left; font-weight: 700; display: flex; align-items: center; gap: 6px; white-space: nowrap;">${getFlagImgHtml(m.local)} ${m.local} <span style="font-weight: 400; color: var(--color-text-muted);">vs</span> ${getFlagImgHtml(m.visitor)} ${m.visitor}</td>
        <td>${m.phase === 'Group Stage' ? 'Grupo ' + m.group : m.phase}</td>
        <td style="font-weight: 800; color: ${hasRealResult ? 'var(--accent-gold)' : 'var(--color-text-muted)'}">${realScoreStr}</td>
    `;
    
    participants.forEach(p => {
      const pred = masterPredictions[p].matches[m.id];
      if (!pred || pred.gl === undefined || pred.gl === null || pred.gl === '') {
        bodyHtml += `<td style="color: var(--color-text-muted);">-</td>`;
      } else {
        const isKnockout = m.phase !== 'Group Stage';
        
        if (!isKnockout) {
          // Group stage scoring (blind goals comparison)
          const predScoreStr = `${pred.gl} - ${pred.gv}`;
          let ptsBadge = '';
          if (hasRealResult) {
            const realGl = parseInt(m.gl);
            const realGv = parseInt(m.gv);
            const predGl = parseInt(pred.gl);
            const predGv = parseInt(pred.gv);
            
            const isExact = (realGl === predGl) && (realGv === predGv);
            const isOutcome = Math.sign(realGl - realGv) === Math.sign(predGl - predGv);
            
            if (isExact) {
              ptsBadge = `<span class="matrix-points-badge points-exact">+3</span>`;
            } else if (isOutcome) {
              ptsBadge = `<span class="matrix-points-badge points-outcome">+1</span>`;
            } else {
              ptsBadge = `<span class="matrix-points-badge points-zero">0</span>`;
            }
          }
          bodyHtml += `<td>${predScoreStr} ${ptsBadge}</td>`;
        } else {
          // Knockout stage scoring (bracket-aware)
          const hasPk = pred.pkl !== undefined && pred.pkl !== null && pred.pkl !== '';
          const predScoreStr = `${pred.gl} - ${pred.gv}${hasPk ? ` (${pred.pkl}-${pred.pkv})` : ''}`;
          const usrMatch = userBrackets[p][m.id];
          const actMatch = actualBracket[m.id];
          
          let ptsBadge = '';
          if (actMatch && actMatch.winner) {
            if (usrMatch && usrMatch.winner && actMatch.winner === usrMatch.winner) {
              let isExact = false;
              if (actMatch.local === usrMatch.local && actMatch.visitor === usrMatch.visitor) {
                const realGl = parseInt(m.gl);
                const realGv = parseInt(m.gv);
                const predGl = parseInt(pred.gl);
                const predGv = parseInt(pred.gv);
                if (realGl === predGl && realGv === predGv) {
                  isExact = true;
                }
              }
              if (isExact) {
                ptsBadge = `<span class="matrix-points-badge points-exact">+3</span>`;
              } else {
                ptsBadge = `<span class="matrix-points-badge points-outcome">+1</span>`;
              }
            } else {
              ptsBadge = `<span class="matrix-points-badge points-zero">0</span>`;
            }
          }
          
          let matchupText = '';
          if (usrMatch && usrMatch.local && usrMatch.visitor) {
            matchupText = `<div style="font-size: 0.72rem; color: var(--color-text-muted); margin-top: 2px; line-height: 1.1;">${usrMatch.local} vs ${usrMatch.visitor}</div>`;
          }
          
          bodyHtml += `<td><div>${predScoreStr} ${ptsBadge}</div>${matchupText}</td>`;
        }
      }
    });
    
    bodyHtml += '</tr>';
  });
  
  tbody.innerHTML = bodyHtml;
}

// Filter the Matrix Table search input
function filterMatrixTable() {
  const query = document.getElementById('search-matrix').value.toLowerCase().trim();
  const rows = document.querySelectorAll('.matrix-row-item');
  
  rows.forEach(r => {
    const text = r.innerText.toLowerCase();
    if (text.includes(query)) {
      r.style.display = '';
    } else {
      r.style.display = 'none';
    }
  });
}

async function handleLogout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/index.html';
}

function showToast(message, isError = false) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${isError ? 'error' : 'success'}`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
