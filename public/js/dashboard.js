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
    const res = await fetch('/api/predictions-master');
    if (res.ok) {
      masterPredictions = await res.json();
      document.getElementById('matrix-lock-notice').innerText = "✅ Los pronósticos de todos los participantes ya están visibles.";
    } else {
      // Fallback: load only the current user's predictions for their own column
      if (currentUser) {
        const singleRes = await fetch(`/api/predictions/${currentUser.id}`);
        const singlePred = await singleRes.json();
        masterPredictions = {};
        masterPredictions[currentUser.username] = singlePred;
      }
    }
    renderMatrixTable();
  } catch (err) {
    console.error("Error loading master predictions:", err);
  }
}

// Render Leaderboard
function renderLeaderboard() {
  const tbody = document.getElementById('leaderboard-body');
  if (leaderboardData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="color: var(--color-text-muted); padding: 30px;">No hay participantes registrados.</td></tr>`;
    return;
  }
  
  let html = '';
  leaderboardData.forEach((p, idx) => {
    let medal = p.rank;
    if (p.rank === 1) medal = '<span class="medal-gold">🥇</span>';
    else if (p.rank === 2) medal = '<span class="medal-silver">🥈</span>';
    else if (p.rank === 3) medal = '<span class="medal-bronze">🥉</span>';
    
    const isMe = currentUser && currentUser.username === p.username;
    const highlightClass = isMe ? 'style="background: rgba(0, 181, 173, 0.08); border-left: 3px solid var(--primary);"' : '';
    
    html += `
      <tr ${highlightClass}>
        <td class="rank-cell">${medal}</td>
        <td class="user-cell">${p.username} ${isMe ? '<small style="color: var(--primary); font-weight: 800;">(Tú)</small>' : ''}</td>
        <td>${p.matchPoints}</td>
        <td>${p.totalSpecials}</td>
        <td class="total-cell">${p.total}</td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
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
        <td style="text-align: left; font-weight: 700;">${m.local} vs ${m.visitor}</td>
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
