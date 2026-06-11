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
    if (p.rank === 1) avatarStyle = 'style="background: var(--accent-gold); color: #000; font-weight: 800;"';
    else if (p.rank === 2) avatarStyle = 'style="background: hsl(0, 0%, 75%); color: #000;"';
    else if (p.rank === 3) avatarStyle = 'style="background: hsl(20, 60%, 55%);"';
    
    listHtml += `
      <div class="leaderboard-item ${isMe ? 'is-me' : ''}">
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
function renderChart() {
  const ctx = document.getElementById('evolutionChart').getContext('2d');
  
  if (rankingHistory.length === 0) {
    ctx.font = "14px Segoe UI";
    ctx.fillStyle = "#a0aec0";
    ctx.textAlign = "center";
    ctx.fillText("No hay partidos jugados todavía para registrar evolución.", 150, 100);
    return;
  }
  
  // X-Axis labels: Match IDs that have rankings
  const labels = rankingHistory.map(h => h.matchId);
  
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
          suggestedMax: Math.max(2, participants.length),
          ticks: {
            color: '#718096',
            stepSize: 1,
            precision: 0
          },
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        }
      }
    }
  });
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
        const predScoreStr = `${pred.gl} - ${pred.gv}`;
        
        // Compute points if real result exists
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
