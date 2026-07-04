// Team Rankings and Flag CDN codes for all 48 teams
const TEAM_DATA = {
  "Mexico": { rank: 17, flag: "mx" }, "Sudafrica": { rank: 59, flag: "za" }, "Corea del Sur": { rank: 24, flag: "kr" }, "Rep. Checa": { rank: 36, flag: "cz" },
  "Canada": { rank: 40, flag: "ca" }, "Bosnia y Herzegovina": { rank: 74, flag: "ba" }, "Catar": { rank: 34, flag: "qa" }, "Suiza": { rank: 15, flag: "ch" },
  "Brasil": { rank: 5, flag: "br" }, "Marruecos": { rank: 13, flag: "ma" }, "Haiti": { rank: 86, flag: "ht" }, "Escocia": { rank: 39, flag: "gb-sct" },
  "Estados Unidos": { rank: 16, flag: "us" }, "Paraguay": { rank: 56, flag: "py" }, "Australia": { rank: 25, flag: "au" }, "Turquia": { rank: 35, flag: "tr" },
  "Alemania": { rank: 11, flag: "de" }, "Curazao": { rank: 90, flag: "cw" }, "Costa de Marfil": { rank: 38, flag: "ci" }, "Ecuador": { rank: 30, flag: "ec" },
  "Paises Bajos": { rank: 7, flag: "nl" }, "Japon": { rank: 18, flag: "jp" }, "Suecia": { rank: 23, flag: "se" }, "Tunez": { rank: 41, flag: "tn" },
  "Belgica": { rank: 6, flag: "be" }, "Egipto": { rank: 37, flag: "eg" }, "Iran": { rank: 20, flag: "ir" }, "Nueva Zelanda": { rank: 103, flag: "nz" },
  "Espana": { rank: 3, flag: "es" }, "Cabo Verde": { rank: 65, flag: "cv" }, "Arabia Saudi": { flag: "sa" }, "Uruguay": { rank: 14, flag: "uy" },
  "Francia": { rank: 2, flag: "fr" }, "Senegal": { rank: 19, flag: "sn" }, "Noruega": { rank: 45, flag: "no" }, "Irak": { rank: 55, flag: "iq" },
  "Argentina": { rank: 1, flag: "ar" }, "Argelia": { rank: 44, flag: "dz" }, "Austria": { rank: 22, flag: "at" }, "Jordania": { rank: 71, flag: "jo" },
  "Portugal": { rank: 8, flag: "pt" }, "RD Congo": { rank: 62, flag: "cd" }, "Uzbekistan": { rank: 66, flag: "uz" }, "Colombia": { rank: 12, flag: "co" },
  "Inglaterra": { rank: 4, flag: "gb-eng" }, "Croacia": { rank: 10, flag: "hr" }, "Ghana": { rank: 64, flag: "gh" }, "Panama": { rank: 43, flag: "pa" }
};

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

function getFlagImgHtml(teamName) {
  const data = TEAM_DATA[teamName];
  if (!data || !data.flag) return '🏳️';
  return `<img src="https://flagcdn.com/w40/${data.flag.toLowerCase()}.png" class="flag-img inline" alt="${teamName}" style="width: 20px; height: 13px; margin-right: 4px; vertical-align: middle;">`;
}

function getTeamAcronym(teamName) {
  if (!teamName) return '';
  if (TEAM_ACRONYMS[teamName]) return TEAM_ACRONYMS[teamName];
  const clean = teamName.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return clean.substring(0, 3).toUpperCase();
}

let currentUser = null;
let allMatches = [];
let leaderboardData = [];
let rankingHistory = [];
let masterPredictions = null;
let focusedUser = null;
let activeTrophyAnimId = null;

// Visual Colors for Custom Graph lines
const LINE_COLORS = [
  '#3CAC3B', '#2A398D', '#E61D25', '#F59E0B', '#10B981', 
  '#EC4899', '#8B5CF6', '#3B82F6', '#06B6D4', '#F43F5E',
  '#14B8A6', '#F97316', '#6366F1', '#A855F7', '#84CC16',
  '#EAB308', '#D946EF', '#6B7280', '#0F172A', '#475569'
];

document.addEventListener("DOMContentLoaded", async () => {
  await verifySession();
  await loadMatches();
  await loadLeaderboard();
  await loadMasterPredictions();
  initDashboardHeroBall();
});

async function verifySession() {
  const res = await fetch('/api/auth/me');
  const data = await res.json();
  if (data.user) {
    currentUser = data.user;
    focusedUser = currentUser.username;
    document.getElementById('user-greeting').innerText = `¡Hola, ${currentUser.username}!`;
    document.getElementById('user-greeting-mobile').innerText = `¡Hola, ${currentUser.username}!`;
    if (currentUser.isAdmin) {
      document.getElementById('admin-nav-link').style.display = 'inline-block';
      document.getElementById('admin-nav-link-mobile').style.display = 'inline-block';
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
    
    if (!focusedUser && leaderboardData[0]) {
      focusedUser = leaderboardData[0].username;
    }
    
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
    
    const showBlocked = !deadlineData.isPassed && (!currentUser || !currentUser.isAdmin);
    
    if (showBlocked) {
      document.getElementById('matrix-table-wrapper').classList.add('hidden');
      document.getElementById('search-matrix').classList.add('hidden');
      document.getElementById('matrix-blocked-container').classList.remove('hidden');
      document.getElementById('matrix-lock-notice').classList.add('hidden');
      return;
    }
    
    const res = await fetch('/api/predictions-master');
    if (res.ok) {
      masterPredictions = await res.json();
      document.getElementById('matrix-lock-notice').innerText = "✅ Los pronósticos de todos los participantes ya están visibles.";
      document.getElementById('matrix-table-wrapper').classList.remove('hidden');
      document.getElementById('search-matrix').classList.remove('hidden');
      document.getElementById('matrix-blocked-container').classList.add('hidden');
      renderMatrixTable();
    } else {
      document.getElementById('matrix-table-wrapper').classList.add('hidden');
      document.getElementById('search-matrix').classList.add('hidden');
      document.getElementById('matrix-blocked-container').classList.remove('hidden');
      document.getElementById('matrix-lock-notice').classList.add('hidden');
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
    container.innerHTML = `<div class="text-gray-400 py-12 text-center text-sm font-medium">No hay participantes registrados.</div>`;
    return;
  }
  
  const p1 = leaderboardData[0]; 
  const p2 = leaderboardData[1]; 
  const p3 = leaderboardData[2]; 
  
  const maxScore = Math.max(1, leaderboardData[0]?.total || 0);
  
  const getPodiumBadge = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };
  
  let podiumHtml = '';
  if (p1 || p2 || p3) {
    podiumHtml += `<div class="podium-container">`;
    
    // Left step: 2nd place
    if (p2) {
      const isMe = currentUser && currentUser.username === p2.username;
      const highlightBorder = isMe ? 'style="border-color: var(--neon-green);"' : '';
      const badge = getPodiumBadge(p2.rank);
      podiumHtml += `
        <div class="podium-step second cursor-pointer" onclick="focusParticipant('${p2.username}')" ${highlightBorder}>
          <div class="podium-badge text-xl mb-1">${badge}</div>
          <div class="podium-name font-bold text-[11px] text-gray-200" title="${p2.username}">${p2.username} ${isMe ? '(Tú)' : ''}</div>
          <div class="podium-pts font-black text-xs mt-1 text-[#3CAC3B]">${p2.total} pts</div>
        </div>
      `;
    } else {
      podiumHtml += `<div class="podium-step second opacity-30 border-dashed"><div class="podium-badge">🥈</div></div>`;
    }
    
    // Center step: 1st place with 3D Trophy
    if (p1) {
      const isMe = currentUser && currentUser.username === p1.username;
      const highlightBorder = isMe ? 'style="border-color: #F59E0B;"' : '';
      podiumHtml += `
        <div class="podium-step first cursor-pointer flex flex-col items-center justify-between" onclick="focusParticipant('${p1.username}')" ${highlightBorder}>
          <div class="w-16 h-[72px] relative flex items-center justify-center pointer-events-auto overflow-hidden" id="trophy-3d-container">
            <model-viewer 
              src="/models3d/copa_mundial_-_cup_world.glb" 
              alt="Copa del Mundo" 
              auto-rotate 
              camera-controls 
              shadow-intensity="1"
              interaction-prompt="none"
              style="width: 100%; height: 100%; --poster-color: transparent; background: transparent;">
            </model-viewer>
          </div>
          <div class="podium-name font-bold text-xs mt-1 text-[#F59E0B]" title="${p1.username}">${p1.username} ${isMe ? '(Tú)' : ''}</div>
          <div class="podium-pts font-black text-sm mt-1 text-[#F59E0B]">${p1.total} pts</div>
        </div>
      `;
    } else {
      podiumHtml += `<div class="podium-step first opacity-30 border-dashed"><div class="podium-badge">🥇</div></div>`;
    }
    
    // Right step: 3rd place
    if (p3) {
      const isMe = currentUser && currentUser.username === p3.username;
      const highlightBorder = isMe ? 'style="border-color: var(--neon-green);"' : '';
      const badge = getPodiumBadge(p3.rank);
      podiumHtml += `
        <div class="podium-step third cursor-pointer" onclick="focusParticipant('${p3.username}')" ${highlightBorder}>
          <div class="podium-badge text-xl mb-1">${badge}</div>
          <div class="podium-name font-bold text-[11px] text-gray-200" title="${p3.username}">${p3.username} ${isMe ? '(Tú)' : ''}</div>
          <div class="podium-pts font-black text-xs mt-1 text-[#3CAC3B]">${p3.total} pts</div>
        </div>
      `;
    } else {
      podiumHtml += `<div class="podium-step third opacity-30 border-dashed"><div class="podium-badge">🥉</div></div>`;
    }
    
    podiumHtml += `</div>`;
  }
  
  // List of all players
  let listHtml = `<div class="leaderboard-list mt-6">`;
  
  leaderboardData.forEach((p, idx) => {
    const isMe = currentUser && currentUser.username === p.username;
    const initial = p.username.charAt(0);
    const progressPercent = Math.min(100, Math.max(5, (p.total / maxScore) * 100));
    
    let avatarStyle = '';
    let rankClass = '';
    if (p.rank === 1) {
      avatarStyle = 'style="background: #F59E0B; color: #000; font-weight: 800;"';
      rankClass = 'rank-first';
    } else if (p.rank === 2) {
      avatarStyle = 'style="background: hsl(0, 0%, 75%); color: #000;"';
      rankClass = 'rank-second';
    } else if (p.rank === 3) {
      avatarStyle = 'style="background: #b45309;"';
      rankClass = 'rank-third';
    }
    
    const isFocused = p.username === focusedUser;
    const borderFocusClass = isFocused ? 'border-neonGreen bg-white/[0.08] shadow-[0_0_15px_rgba(60,172,59,0.15)]' : '';
    
    listHtml += `
      <div class="leaderboard-item ${isMe ? 'is-me' : ''} ${rankClass} ${borderFocusClass}" onclick="focusParticipant('${p.username}')">
        <div class="item-rank">#${p.rank}</div>
        <div class="item-avatar" ${avatarStyle}>${initial}</div>
        <div class="item-info">
          <div class="item-name-wrapper">
            <span class="item-username font-black">${p.username}</span>
            ${isMe ? '<span class="item-me-tag">Tú</span>' : ''}
          </div>
          <div class="item-points-bar-container">
            <div class="item-points-bar" style="width: ${progressPercent}%;"></div>
          </div>
        </div>
        <div class="item-score-pills flex-shrink-0">
          <div class="score-pill">⚽ ${p.matchPoints} pts</div>
          <div class="score-pill total">${p.total} pts</div>
        </div>
      </div>
    `;
  });
  
  listHtml += `</div>`;
  container.innerHTML = podiumHtml + listHtml;
  
  // Call World Cup 3D Trophy initialization after DOM updates
  setTimeout(initWorldCupTrophy3D, 50);
}

// Interactive focus function
window.focusParticipant = function(username) {
  focusedUser = username;
  renderLeaderboard(); // Redraw selection outline
  
  // Re-run path drawing animation on line focus
  chartAnimationProgress = 0;
  renderChart();
};

// ==========================================
// Custom HTML5 Canvas "Dynamic Pulse Graph"
// ==========================================
let chartAnimationProgress = 0;
let chartAnimId = null;
let continuousRippleId = null;

function renderChart() {
  const canvas = document.getElementById('evolutionChart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  if (rankingHistory.length === 0) {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.scale(dpr, dpr);
    
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    ctx.font = "14px Outfit, sans-serif";
    ctx.fillStyle = "#9ca3af";
    ctx.textAlign = "center";
    ctx.fillText("No hay partidos jugados todavía para registrar evolución.", canvas.clientWidth / 2, canvas.clientHeight / 2);
    return;
  }
  
  // Trigger entry linear progress animation
  if (chartAnimationProgress === 0) {
    animatePath();
    return;
  }
  
  drawCanvasContent();
}

function animatePath() {
  if (chartAnimId) cancelAnimationFrame(chartAnimId);
  const start = Date.now();
  const duration = 1000; // 1s drawing animation
  
  function tick() {
    const now = Date.now();
    const t = Math.min(1, (now - start) / duration);
    // Cubic ease out
    chartAnimationProgress = 1 - Math.pow(1 - t, 3);
    
    drawCanvasContent();
    
    if (t < 1) {
      chartAnimId = requestAnimationFrame(tick);
    } else {
      // Start perpetual Fresnel wave ripple animation once path loads
      startContinuousRipple();
    }
  }
  chartAnimId = requestAnimationFrame(tick);
}

function startContinuousRipple() {
  if (continuousRippleId) cancelAnimationFrame(continuousRippleId);
  
  function rippleTick() {
    drawCanvasContent();
    continuousRippleId = requestAnimationFrame(rippleTick);
  }
  continuousRippleId = requestAnimationFrame(rippleTick);
}

function drawCanvasContent() {
  const canvas = document.getElementById('evolutionChart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  
  // High-DPI Crisp scaling
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);
  
  ctx.clearRect(0, 0, width, height);
  
  const displayType = document.getElementById('chart-display-type')?.value || 'points';
  
  const paddingLeft = 55;
  const paddingRight = 20;
  const paddingTop = 35;
  const paddingBottom = 40;
  
  const graphWidth = width - paddingLeft - paddingRight;
  const graphHeight = height - paddingTop - paddingBottom;
  
  const participants = leaderboardData.map(p => p.username);
  if (participants.length === 0) return;
  
  // Assemble history values per user (prepended with "Inicio" state)
  const userValues = {};
  participants.forEach(user => {
    const startVal = displayType === 'points' ? 0 : 1;
    userValues[user] = [
      startVal,
      ...rankingHistory.map(h => {
        if (displayType === 'points') {
          const pts = h.points ? h.points[user] : undefined;
          return pts !== undefined ? pts : 0;
        } else {
          const rk = h.ranks ? h.ranks[user] : undefined;
          return rk !== undefined ? rk : participants.length;
        }
      })
    ];
  });
  
  // Find min/max values
  let minY = displayType === 'points' ? 0 : 1;
  let maxY = 1;
  
  if (displayType === 'points') {
    rankingHistory.forEach(h => {
      if (h.points) {
        Object.values(h.points).forEach(val => {
          if (val > maxY) maxY = val;
        });
      }
    });
    maxY = Math.max(1, maxY + 2); // safety ceiling
  } else {
    maxY = Math.max(2, participants.length); // ranks bottom
  }
  
  // Draw Grid Lines & Y-Axis Labels
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#9CA3AF';
  ctx.font = '700 9px monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  
  const numTicks = 6;
  for (let i = 0; i < numTicks; i++) {
    const ratio = i / (numTicks - 1);
    const val = minY + ratio * (maxY - minY);
    
    let yCoord;
    if (displayType === 'points') {
      yCoord = paddingTop + (1 - ratio) * graphHeight; // 0 points at bottom
    } else {
      yCoord = paddingTop + ratio * graphHeight; // #1 rank at top
    }
    
    ctx.beginPath();
    ctx.moveTo(paddingLeft, yCoord);
    ctx.lineTo(width - paddingRight, yCoord);
    ctx.stroke();
    
    const label = displayType === 'points' ? Math.round(val) + ' pts' : '#' + Math.round(val);
    ctx.fillText(label, paddingLeft - 8, yCoord);
  }
  
  // X-Axis Match ticks and Labels
  const numPoints = rankingHistory.length + 1;
  const stepX = numPoints > 1 ? graphWidth / (numPoints - 1) : graphWidth;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  
  const labelInterval = Math.max(1, Math.ceil(numPoints / 10));
  
  for (let idx = 0; idx < numPoints; idx++) {
    const xCoord = paddingLeft + idx * stepX;
    
    // Draw vertical dotted guide lines
    ctx.strokeStyle = 'rgba(255,255,255,0.02)';
    ctx.beginPath();
    ctx.moveTo(xCoord, paddingTop);
    ctx.lineTo(xCoord, height - paddingBottom);
    ctx.stroke();
    
    if (idx % labelInterval === 0 || idx === numPoints - 1) {
      let label = "";
      if (idx === 0) {
        label = "Inicio";
      } else {
        const h = rankingHistory[idx - 1];
        const match = allMatches.find(m => m.id === h.matchId);
        label = h.matchId;
        if (match) {
          const loc = getTeamAcronym(match.local);
          const vis = getTeamAcronym(match.visitor);
          label = `${loc}-${vis}`;
        }
      }
      ctx.fillText(label, xCoord, height - paddingBottom + 8);
    }
  }
  
  // Calculate specific points coordinates for all users
  const userCoordinates = {};
  participants.forEach(user => {
    userCoordinates[user] = userValues[user].map((val, idx) => {
      const x = paddingLeft + idx * stepX;
      let ratio = (val - minY) / (maxY - minY);
      // Clamp ratio
      ratio = Math.max(0, Math.min(1, ratio));
      
      const y = displayType === 'points' 
        ? paddingTop + (1 - ratio) * graphHeight
        : paddingTop + ratio * graphHeight;
        
      return { x, y };
    });
  });
  
  // Helper to generate bezier curves command sequences
  function traceBezierCurve(pointsList, progress) {
    if (pointsList.length === 0) return;
    
    const limitX = paddingLeft + progress * graphWidth;
    
    ctx.moveTo(pointsList[0].x, pointsList[0].y);
    for (let i = 0; i < pointsList.length - 1; i++) {
      const pStart = pointsList[i];
      const pEnd = pointsList[i + 1];
      
      // Stop path segment draw according to path progress
      if (pStart.x > limitX) break;
      
      const cp1x = pStart.x + stepX / 3;
      const cp1y = pStart.y;
      const cp2x = pStart.x + (stepX * 2) / 3;
      const cp2y = pEnd.y;
      
      if (pEnd.x <= limitX) {
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, pEnd.x, pEnd.y);
      } else {
        // Interpolate bezier segment cut points
        const segmentRatio = (limitX - pStart.x) / stepX;
        const xCut = limitX;
        const yCut = pStart.y + (pEnd.y - pStart.y) * segmentRatio; // linear fallback slice
        ctx.lineTo(xCut, yCut);
      }
    }
  }

  // 1. Draw Background Gray/Blue Splines (for non-focused users)
  ctx.shadowBlur = 0; // No glow on background lines
  ctx.lineWidth = 1.2;
  participants.forEach(user => {
    if (user === focusedUser) return;
    
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    traceBezierCurve(userCoordinates[user], chartAnimationProgress);
    ctx.stroke();
  });
  
  // Helper to get points gained in a specific match index (0-based relative to rankingHistory)
  const getPointsGainedAtMatch = (user, matchIdx) => {
    if (matchIdx < 0 || matchIdx >= rankingHistory.length) return 0;
    const currentPts = rankingHistory[matchIdx].points?.[user] || 0;
    const prevPts = matchIdx > 0 ? (rankingHistory[matchIdx - 1].points?.[user] || 0) : 0;
    return currentPts - prevPts;
  };
  
  // 2. Draw FOCUSED User Spline & Fresnel Area
  if (focusedUser && userCoordinates[focusedUser]) {
    const coords = userCoordinates[focusedUser];
    const vals = userValues[focusedUser];
    
    // Draw Fresnel fill underneath spline
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(coords[0].x, height - paddingBottom);
    ctx.lineTo(coords[0].x, coords[0].y);
    
    // Trace curve path
    const limitX = paddingLeft + chartAnimationProgress * graphWidth;
    for (let i = 0; i < coords.length - 1; i++) {
      const pStart = coords[i];
      const pEnd = coords[i + 1];
      if (pStart.x > limitX) break;
      
      const cp1x = pStart.x + stepX / 3;
      const cp1y = pStart.y;
      const cp2x = pStart.x + (stepX * 2) / 3;
      const cp2y = pEnd.y;
      
      if (pEnd.x <= limitX) {
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, pEnd.x, pEnd.y);
      } else {
        ctx.lineTo(limitX, pStart.y + (pEnd.y - pStart.y) * ((limitX - pStart.x) / stepX));
      }
    }
    const currentLastX = Math.min(limitX, coords[coords.length - 1].x);
    ctx.lineTo(currentLastX, height - paddingBottom);
    ctx.closePath();
    ctx.clip(); // Restrict drawing to area under line
    
    // Fill vertical gradient
    const fillGrad = ctx.createLinearGradient(0, paddingTop, 0, height - paddingBottom);
    fillGrad.addColorStop(0, 'rgba(60, 172, 59, 0.16)');  // Neon Green fading
    fillGrad.addColorStop(0.5, 'rgba(42, 57, 141, 0.05)'); // Electric Blue blending
    fillGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = fillGrad;
    ctx.fill();
    
    // Secondary moving wave ripple (Fresnel effect)
    const time = performance.now() * 0.0012;
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.lineWidth = 1.5;
    for (let x = paddingLeft; x <= currentLastX; x += 6) {
      const ratio = (x - paddingLeft) / graphWidth;
      const waveY = (height - paddingBottom - 40) + Math.sin(time * 2 + ratio * 10) * 12 + Math.cos(time + ratio * 5) * 6;
      if (x === paddingLeft) ctx.moveTo(x, waveY);
      else ctx.lineTo(x, waveY);
    }
    ctx.stroke();
    ctx.restore();
    
    // Draw neon glowing spline segments (colors matching rises/falls)
    for (let i = 0; i < coords.length - 1; i++) {
      const pStart = coords[i];
      const pEnd = coords[i + 1];
      if (pStart.x > limitX) break;
      
      const ptsDiff = getPointsGainedAtMatch(focusedUser, i);
      
      // Color selection (Gold for 3 points, Green for 1/2 points, Red for <= 0 points)
      let segmentColor;
      if (ptsDiff === 3) {
        segmentColor = '#F59E0B'; // FWC Trophy Gold for exact score
      } else if (ptsDiff > 0) {
        segmentColor = '#3CAC3B'; // Neon Green
      } else {
        segmentColor = '#E61D25'; // Torch Red
      }
      
      // Draw segment with solid color to highlight +3 points segment clearly
      ctx.beginPath();
      ctx.moveTo(pStart.x, pStart.y);
      
      const cp1x = pStart.x + stepX / 3;
      const cp1y = pStart.y;
      const cp2x = pStart.x + (stepX * 2) / 3;
      const cp2y = pEnd.y;
      
      ctx.strokeStyle = segmentColor;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      
      // Apply neon glow using shadow properties
      ctx.shadowBlur = 14;
      ctx.shadowColor = segmentColor;
      
      if (pEnd.x <= limitX) {
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, pEnd.x, pEnd.y);
      } else {
        ctx.lineTo(limitX, pStart.y + (pEnd.y - pStart.y) * ((limitX - pStart.x) / stepX));
      }
      ctx.stroke();
    }
    
    // Reset shadow
    ctx.shadowBlur = 0;
    
    // Draw pulsing nodes on spline points
    coords.forEach((p, idx) => {
      if (p.x > limitX) return;
      
      if (idx === 0) {
        // "Inicio" node: draw a clean neutral white/gray dot
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        return;
      }
      
      // Calculate points gained in this match (index idx - 1)
      const ptsGained = getPointsGainedAtMatch(focusedUser, idx - 1);
      
      let nodeColor;
      if (ptsGained === 3) {
        nodeColor = '#F59E0B'; // FIFA Gold for exact score
      } else if (ptsGained > 0) {
        nodeColor = '#3CAC3B'; // Neon Green
      } else {
        nodeColor = '#E61D25'; // Torch Red
      }
      
      // Pulsing outer ring
      const timeOffset = performance.now() * 0.005;
      const pulseRing = 5.5 + Math.sin(timeOffset + idx * 0.5) * 3;
      
      ctx.fillStyle = ptsGained === 3 ? 'rgba(245, 158, 11, 0.16)' : (ptsGained > 0 ? 'rgba(60, 172, 59, 0.16)' : 'rgba(230, 29, 37, 0.16)');
      ctx.beginPath();
      ctx.arc(p.x, p.y, pulseRing, 0, Math.PI * 2);
      ctx.fill();
      
      // Solid inner core
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = nodeColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  }
}

// Tooltip mouse tracker inside the graph canvas
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('evolutionChart');
  if (!canvas) return;
  
  canvas.addEventListener('mousemove', (e) => {
    if (rankingHistory.length === 0 || !leaderboardData || !focusedUser) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const paddingLeft = 55;
    const paddingRight = 20;
    const paddingTop = 35;
    const paddingBottom = 40;
    
    const graphWidth = canvas.clientWidth - paddingLeft - paddingRight;
    const graphHeight = canvas.clientHeight - paddingTop - paddingBottom;
    const numPoints = rankingHistory.length + 1;
    const stepX = numPoints > 1 ? graphWidth / (numPoints - 1) : graphWidth;
    
    const displayType = document.getElementById('chart-display-type')?.value || 'points';
    
    // Fetch values for focused user
    const startVal = displayType === 'points' ? 0 : 1;
    const vals = [
      startVal,
      ...rankingHistory.map(h => {
        if (displayType === 'points') {
          const pts = h.points ? h.points[focusedUser] : undefined;
          return pts !== undefined ? pts : 0;
        } else {
          const rk = h.ranks ? h.ranks[focusedUser] : undefined;
          return rk !== undefined ? rk : leaderboardData.length;
        }
      })
    ];
    
    let minY = displayType === 'points' ? 0 : 1;
    let maxY = 1;
    if (displayType === 'points') {
      rankingHistory.forEach(h => {
        if (h.points) {
          Object.values(h.points).forEach(val => {
            if (val > maxY) maxY = val;
          });
        }
      });
      maxY = Math.max(1, maxY + 2);
    } else {
      maxY = Math.max(2, leaderboardData.length);
    }
    
    let nearestIdx = -1;
    let minDistance = 14; // pixels trigger threshold
    
    for (let i = 0; i < numPoints; i++) {
      const x = paddingLeft + i * stepX;
      const val = vals[i];
      let ratio = (val - minY) / (maxY - minY);
      ratio = Math.max(0, Math.min(1, ratio));
      
      const y = displayType === 'points'
        ? paddingTop + (1 - ratio) * graphHeight
        : paddingTop + ratio * graphHeight;
        
      const dist = Math.hypot(mouseX - x, mouseY - y);
      if (dist < minDistance) {
        minDistance = dist;
        nearestIdx = i;
      }
    }
    
    const tooltip = document.getElementById('custom-chart-tooltip');
    if (nearestIdx !== -1) {
      const getPointsGainedAtMatch = (user, matchIdx) => {
        if (matchIdx < 0 || matchIdx >= rankingHistory.length) return 0;
        const currentPts = rankingHistory[matchIdx].points?.[user] || 0;
        const prevPts = matchIdx > 0 ? (rankingHistory[matchIdx - 1].points?.[user] || 0) : 0;
        return currentPts - prevPts;
      };

      if (nearestIdx === 0) {
        tooltip.innerHTML = `
          <div class="font-black text-[10px] uppercase tracking-wider border-b border-white/10 pb-1.5 mb-2 flex justify-between items-center gap-6">
            <span class="text-gray-400 font-bold">Inicio</span>
            <span class="text-gray-400 font-black">Comienzo</span>
          </div>
          <div class="space-y-1 text-[10px] text-gray-400 font-medium">
            <div class="text-white font-bold">Comienzo del Torneo</div>
            <div class="mt-2 text-white/90 border-t border-white/5 pt-1.5 font-bold flex justify-between">
              <span>Foco: ${focusedUser}</span>
              <span>Total: ${displayType === 'points' ? 0 : 1} ${displayType === 'points' ? 'pts' : 'º'}</span>
            </div>
          </div>
        `;
        
        let tooltipX = paddingLeft + nearestIdx * stepX + 16;
        if (tooltipX + 180 > canvas.clientWidth) {
          tooltipX = paddingLeft + nearestIdx * stepX - 190;
        }
        let tooltipY = mouseY - 65;
        if (tooltipY < 10) tooltipY = 10;
        
        tooltip.style.left = `${tooltipX}px`;
        tooltip.style.top = `${tooltipY}px`;
        tooltip.style.opacity = '1';
        tooltip.style.transform = 'scale(1) translateY(0)';
      } else {
        const h = rankingHistory[nearestIdx - 1];
        const match = allMatches.find(m => m.id === h.matchId);
        
        let matchName = h.matchId;
        let matchTeams = 'Pendiente';
        let realScore = 'Pendiente';
        
        if (match) {
          matchName = match.phase === 'Group Stage' ? `Fase de Grupos - G.${match.group}` : match.phase;
          matchTeams = `${match.local} vs ${match.visitor}`;
          realScore = match.gl !== null ? `${match.gl} - ${match.gv}` : 'Pendiente';
        }
        
        const currentVal = vals[nearestIdx];
        const ptsGained = getPointsGainedAtMatch(focusedUser, nearestIdx - 1);
        
        let predScore = 'Ninguna';
        if (masterPredictions && masterPredictions[focusedUser] && masterPredictions[focusedUser].matches[h.matchId]) {
          const pred = masterPredictions[focusedUser].matches[h.matchId];
          if (pred.gl !== undefined && pred.gl !== null && pred.gl !== '') {
            const hasPk = pred.pkl !== undefined && pred.pkl !== null && pred.pkl !== '';
            predScore = `${pred.gl} - ${pred.gv}${hasPk ? ` (${pred.pkl}-${pred.pkv})` : ''}`;
          }
        }
        
        let predSectionHtml = `<div>Tu Pronóstico: <span class="text-neonGreen font-bold">${predScore}</span></div>`;
        if (match && match.phase !== 'Group Stage') {
          const userBracket = calculateUserBracket(masterPredictions[focusedUser], allMatches);
          const locAug = getKnockoutAugurySummaryForCell(match.local, userBracket, masterPredictions[focusedUser], match.phase);
          const visAug = getKnockoutAugurySummaryForCell(match.visitor, userBracket, masterPredictions[focusedUser], match.phase);
          if (locAug || visAug) {
            predSectionHtml = `
              <div class="mt-1.5 pt-1.5 border-t border-white/10 flex flex-col gap-0.5">
                <div class="text-gray-400 font-bold text-[9px] uppercase tracking-wider mb-0.5">Pronóstico:</div>
                <div>${locAug ? locAug.html : `<span class="text-gray-500">${getTeamAcronym(match.local)} -</span>`}</div>
                <div>${visAug ? visAug.html : `<span class="text-gray-500">${getTeamAcronym(match.visitor)} -</span>`}</div>
              </div>
            `;
          }
        }
        
        // Position element safely within parent
        let tooltipX = paddingLeft + nearestIdx * stepX + 16;
        if (tooltipX + 180 > canvas.clientWidth) {
          tooltipX = paddingLeft + nearestIdx * stepX - 190;
        }
        let tooltipY = mouseY - 65;
        if (tooltipY < 10) tooltipY = 10;
        
        tooltip.style.left = `${tooltipX}px`;
        tooltip.style.top = `${tooltipY}px`;
        
        const changeText = displayType === 'points' ? `+${ptsGained} pts` : `Puesto #${currentVal}`;
        
        let changeColor = 'text-torchRed';
        if (displayType === 'points') {
          if (ptsGained === 3) changeColor = 'text-gold';
          else if (ptsGained > 0) changeColor = 'text-neonGreen';
        } else {
          const isUp = nearestIdx === 1 || currentVal < vals[nearestIdx-1];
          if (ptsGained === 3) changeColor = 'text-gold';
          else if (isUp) changeColor = 'text-neonGreen';
        }
          
        tooltip.innerHTML = `
          <div class="font-black text-[10px] uppercase tracking-wider border-b border-white/10 pb-1.5 mb-2 flex justify-between items-center gap-6">
            <span class="text-gray-400 font-bold">${matchName}</span>
            <span class="${changeColor} font-black">${changeText}</span>
          </div>
          <div class="space-y-1 text-[10px] text-gray-400 font-medium">
            <div class="text-white font-bold">${matchTeams}</div>
            <div>Marcador Real: <span class="text-gold font-bold">${realScore}</span></div>
            ${predSectionHtml}
            <div class="mt-2 text-white/90 border-t border-white/5 pt-1.5 font-bold flex justify-between">
              <span>Foco: ${focusedUser}</span>
              <span>Total: ${displayType === 'points' ? currentVal : (h.points ? h.points[focusedUser] : 0)} pts</span>
            </div>
          </div>
        `;
        
        tooltip.style.opacity = '1';
        tooltip.style.transform = 'scale(1) translateY(0)';
      }
    } else {
      tooltip.style.opacity = '0';
      tooltip.style.transform = 'scale(0.9) translateY(4px)';
    }
  });
  
  canvas.addEventListener('mouseleave', () => {
    const tooltip = document.getElementById('custom-chart-tooltip');
    tooltip.style.opacity = '0';
    tooltip.style.transform = 'scale(0.9) translateY(4px)';
  });
});

window.toggleChartDisplayType = function() {
  const displayType = document.getElementById('chart-display-type').value;
  const desc = document.getElementById('chart-desc-text');
  if (displayType === 'points') {
    desc.innerText = "Histórico de los puntos totales acumulados de cada participante partido a partido (a más puntos, mejor). Haz clic en un participante de la tabla para enfocar su línea.";
  } else {
    desc.innerText = "Histórico del puesto de cada participante partido a partido (el puesto #1 es el mejor). Haz clic en un participante de la tabla para enfocar su línea.";
  }
  chartAnimationProgress = 0; // reset anim progress
  renderChart();
};

// ==========================================
// Helper logic to simulate playoffs brackets
// ==========================================
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
    { id: "M75", label: "D1", lRef: "1B", vRef: "3o Top 2" },
    { id: "M76", label: "D2", lRef: "1C", vRef: "3o Top 3" },
    { id: "M73", label: "D3", lRef: "1A", vRef: "3o Top 1" },
    { id: "M77", label: "D4", lRef: "2C", vRef: "2D" },
    { id: "M84", label: "D5", lRef: "1H", vRef: "3o Top 8" },
    { id: "M83", label: "D6", lRef: "2G", vRef: "2H" },
    { id: "M82", label: "D7", lRef: "1G", vRef: "3o Top 7" },
    { id: "M81", label: "D8", lRef: "1F", vRef: "3o Top 6" },
    { id: "M74", label: "D9", lRef: "2A", vRef: "2B" },
    { id: "M78", label: "D10", lRef: "1D", vRef: "3o Top 4" },
    { id: "M79", label: "D11", lRef: "1E", vRef: "3o Top 5" },
    { id: "M80", label: "D12", lRef: "2E", vRef: "2F" },
    { id: "M86", label: "D13", lRef: "1J", vRef: "2K" },
    { id: "M85", label: "D14", lRef: "1I", vRef: "2J" },
    { id: "M88", label: "D15", lRef: "1L", vRef: "2I" },
    { id: "M87", label: "D16", lRef: "1K", vRef: "2L" }
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
    { id: "M75", label: "D1" }, { id: "M76", label: "D2" }, { id: "M73", label: "D3" }, { id: "M77", label: "D4" },
    { id: "M84", label: "D5" }, { id: "M83", label: "D6" }, { id: "M82", label: "D7" }, { id: "M81", label: "D8" },
    { id: "M74", label: "D9" }, { id: "M78", label: "D10" }, { id: "M79", label: "D11" }, { id: "M80", label: "D12" },
    { id: "M86", label: "D13" }, { id: "M85", label: "D14" }, { id: "M88", label: "D15" }, { id: "M87", label: "D16" }
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

// Helper to get compact augury summary for knockout team prediction in matrix table cell
function getKnockoutAugurySummaryForCell(teamName, userBracket, predObj, phase) {
  if (!teamName || teamName.startsWith('Ganador') || teamName.startsWith('Perdedor') || teamName.startsWith('Local') || teamName.startsWith('Visitante') || teamName.startsWith('1º') || teamName.startsWith('2º') || teamName.startsWith('3º') || teamName.startsWith('3o')) {
    return null;
  }
  for (const mId in userBracket) {
    const um = userBracket[mId];
    const matchObj = allMatches.find(x => x.id === mId);
    if (matchObj && matchObj.phase === phase) {
      if (um.local === teamName || um.visitor === teamName) {
        const pred = predObj.matches[mId];
        if (!pred || pred.gl === '' || pred.gl === undefined || pred.gl === null || pred.gv === '' || pred.gv === undefined || pred.gv === null) {
          return {
            html: `<span class="whitespace-nowrap opacity-60">⚪ <strong class="text-gray-300 font-bold">${getTeamAcronym(teamName)}</strong> <span class="text-gray-500 text-[9px]">(sin marc.)</span></span>`,
            title: `${teamName}: Sin marcador asignado en esta ronda`
          };
        }
        const isLocal = um.local === teamName;
        const gFor = isLocal ? parseInt(pred.gl) : parseInt(pred.gv);
        const gAgainst = isLocal ? parseInt(pred.gv) : parseInt(pred.gl);
        const won = um.winner === teamName;
        const opp = isLocal ? um.visitor : um.local;
        const oppAcr = getTeamAcronym(opp);
        const teamAcr = getTeamAcronym(teamName);
        let pklStr = '';
        if (pred.pkl !== '' && pred.pkl !== undefined && pred.pkl !== null && pred.pkv !== '' && pred.pkv !== undefined && pred.pkv !== null) {
          const pkFor = isLocal ? pred.pkl : pred.pkv;
          const pkAgainst = isLocal ? pred.pkv : pred.pkl;
          pklStr = ` (PK ${pkFor}-${pkAgainst})`;
        }
        const icon = won ? '🟢' : '🔴';
        const outcomeText = won ? 'ganaba' : 'perdía';
        return {
          html: `<span class="whitespace-nowrap">${icon} <strong class="text-white font-bold">${teamAcr}</strong> ${gFor}-${gAgainst} <span class="text-gray-400 text-[9px]">(vs ${oppAcr})</span></span>`,
          title: `${teamName}: Pusiste que ${outcomeText} ${gFor}-${gAgainst} vs ${opp}${pklStr}`
        };
      }
    }
  }
  return {
    html: `<span class="whitespace-nowrap opacity-60">⚪ <span class="text-gray-400">${getTeamAcronym(teamName)}</span> <span class="text-gray-500 text-[9px]">(no avanzó)</span></span>`,
    title: `${teamName}: No avanzó a esta ronda en la porra`
  };
}

// Render Comparison Matrix
function renderMatrixTable() {
  const thead = document.getElementById('matrix-head');
  const tbody = document.getElementById('matrix-body');
  
  if (!masterPredictions) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-gray-400 py-8 text-center text-sm font-medium">Cargando predicciones...</td></tr>`;
    return;
  }
  
  const participants = Object.keys(masterPredictions).sort();
  
  // Cache user prediction playoff brackets and phase winners
  const userBrackets = {};
  const userPhaseWinners = {};
  participants.forEach(p => {
    userBrackets[p] = calculateUserBracket(masterPredictions[p], allMatches);
    userPhaseWinners[p] = {};
    allMatches.forEach(m => {
      if (m.phase !== 'Group Stage') {
        if (!userPhaseWinners[p][m.phase]) userPhaseWinners[p][m.phase] = new Set();
        const usrM = userBrackets[p][m.id];
        if (usrM && usrM.winner) {
          userPhaseWinners[p][m.phase].add(usrM.winner);
        }
      }
    });
  });
  
  // Calculate actual official bracket
  const officialPredObj = { matches: {}, specials: {} };
  allMatches.forEach(m => {
    officialPredObj.matches[m.id] = { gl: m.gl, gv: m.gv, pkl: m.pkl, pkv: m.pkv };
  });
  const actualBracket = calculateRealBracket(officialPredObj, allMatches);
  
  // Headers
  let headHtml = `
    <tr class="header-row border-b border-white/10">
      <th class="text-left font-extrabold text-[10px] tracking-widest text-gray-400 py-4 px-6">Partido</th>
      <th class="font-extrabold text-[10px] tracking-widest text-gray-400 py-4">Fase</th>
      <th class="font-extrabold text-[10px] tracking-widest text-gray-400 py-4 px-6">Resultado Real</th>
  `;
  
  participants.forEach(p => {
    const isFocused = p === focusedUser;
    const focusClass = isFocused ? 'text-neonGreen font-black border-x border-neonGreen/20 bg-neonGreen/5' : 'text-gray-200';
    headHtml += `<th class="py-4 px-6 font-extrabold text-[11px] uppercase tracking-wide cursor-pointer ${focusClass}" onclick="focusParticipant('${p}')">${p}</th>`;
  });
  headHtml += '</tr>';
  thead.innerHTML = headHtml;
  
  // Rows
  let bodyHtml = '';
  
  allMatches.forEach(m => {
    const hasRealResult = m.gl !== null && m.gv !== null;
    const realScoreStr = hasRealResult ? `${m.gl} - ${m.gv}${m.pkl !== null ? ` (PK ${m.pkl}-${m.pkv})` : ''}` : 'Pendiente';
    
    bodyHtml += `
      <tr class="matrix-row-item hover:bg-white/[0.02]">
        <td class="text-left py-4 px-6 font-bold text-xs flex items-center gap-2 whitespace-nowrap">${getFlagImgHtml(m.local)} ${m.local} <span class="font-normal text-gray-500">vs</span> ${getFlagImgHtml(m.visitor)} ${m.visitor}</td>
        <td class="py-4 text-xs font-semibold text-gray-400">${m.phase === 'Group Stage' ? 'Grupo ' + m.group : m.phase}</td>
        <td class="py-4 px-6 font-black text-xs text-gold">${realScoreStr}</td>
    `;
    
    participants.forEach(p => {
      const isFocused = p === focusedUser;
      const focusCellBg = isFocused ? 'border-x border-neonGreen/10 bg-neonGreen/[0.02]' : '';
      
      const pred = masterPredictions[p].matches[m.id];
      if (!pred || pred.gl === undefined || pred.gl === null || pred.gl === '') {
        bodyHtml += `<td class="py-4 px-6 text-gray-600 text-xs font-bold ${focusCellBg}">-</td>`;
      } else {
        const isKnockout = m.phase !== 'Group Stage';
        
        if (!isKnockout) {
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
          bodyHtml += `<td class="py-4 px-6 text-xs font-bold text-white ${focusCellBg}">${predScoreStr} ${ptsBadge}</td>`;
        } else {
          // Knockout Stage (Bracket calculations)
          const usrMatch = userBrackets[p][m.id];
          const actMatch = actualBracket[m.id];
          
          let ptsBadge = '';
          if (actMatch && actMatch.winner && m.gl !== null && m.gv !== null && m.gl !== '' && m.gv !== '') {
            const realWinner = actMatch.winner;
            const realWinnerIsLocal = (realWinner === m.local);
            const realGl = parseInt(m.gl);
            const realGv = parseInt(m.gv);
            const realWinnerGFor = realWinnerIsLocal ? realGl : realGv;
            const realWinnerGAgainst = realWinnerIsLocal ? realGv : realGl;
            
            const realPkl = (m.pkl !== null && m.pkl !== undefined && m.pkl !== '') ? parseInt(m.pkl) : null;
            const realPkv = (m.pkv !== null && m.pkv !== undefined && m.pkv !== '') ? parseInt(m.pkv) : null;
            const realWinnerPkFor = (realPkl !== null && realPkv !== null) ? (realWinnerIsLocal ? realPkl : realPkv) : null;
            const realWinnerPkAgainst = (realPkl !== null && realPkv !== null) ? (realWinnerIsLocal ? realPkv : realPkl) : null;
            
            let hasPredictedAdvancement = false;
            let isExact = false;
            
            for (const pMatchId in userBrackets[p]) {
              const matchObj = allMatches.find(x => x.id === pMatchId);
              if (matchObj && matchObj.phase === m.phase) {
                const uM = userBrackets[p][pMatchId];
                if (uM && (uM.local === realWinner || uM.visitor === realWinner)) {
                  if (uM.winner === realWinner) {
                    hasPredictedAdvancement = true;
                    const pPred = masterPredictions[p].matches[pMatchId];
                    if (pPred && pPred.gl !== '' && pPred.gl !== undefined && pPred.gl !== null && pPred.gv !== '' && pPred.gv !== undefined && pPred.gv !== null) {
                      const predGl = parseInt(pPred.gl);
                      const predGv = parseInt(pPred.gv);
                      const usrWinnerIsLocal = (uM.local === realWinner);
                      const usrGFor = usrWinnerIsLocal ? predGl : predGv;
                      const usrGAgainst = usrWinnerIsLocal ? predGv : predGl;
                      
                      const predPkl = (pPred.pkl !== null && pPred.pkl !== undefined && pPred.pkl !== '') ? parseInt(pPred.pkl) : null;
                      const predPkv = (pPred.pkv !== null && pPred.pkv !== undefined && pPred.pkv !== '') ? parseInt(pPred.pkv) : null;
                      const usrPkFor = (predPkl !== null && predPkv !== null) ? (usrWinnerIsLocal ? predPkl : predPkv) : null;
                      const usrPkAgainst = (predPkl !== null && predPkv !== null) ? (usrWinnerIsLocal ? predPkv : predPkl) : null;
                      
                      const goalsMatch = (usrGFor === realWinnerGFor && usrGAgainst === realWinnerGAgainst);
                      const isDrawInReg = (realWinnerGFor === realWinnerGAgainst);
                      const pkMatch = isDrawInReg ? (usrPkFor === realWinnerPkFor && usrPkAgainst === realWinnerPkAgainst) : true;
                      
                      if (goalsMatch && pkMatch) {
                        isExact = true;
                      }
                    }
                  }
                }
              }
            }
            
            if (isExact) {
              ptsBadge = `<span class="matrix-points-badge points-exact">+3</span>`;
            } else if (hasPredictedAdvancement) {
              ptsBadge = `<span class="matrix-points-badge points-outcome">+1</span>`;
            } else {
              ptsBadge = `<span class="matrix-points-badge points-zero">0</span>`;
            }
          }
          
          let cellContent = '';
          const locAug = getKnockoutAugurySummaryForCell(m.local, userBrackets[p], masterPredictions[p], m.phase);
          const visAug = getKnockoutAugurySummaryForCell(m.visitor, userBrackets[p], masterPredictions[p], m.phase);
          
          if (locAug || visAug) {
            cellContent = `
              <div class="flex flex-col gap-1 text-[10px] text-left">
                <div class="flex items-center justify-between gap-1">
                  <div title="${locAug ? locAug.title : ''}">${locAug ? locAug.html : `<span class="text-gray-500">${getTeamAcronym(m.local)} -</span>`}</div>
                  ${ptsBadge ? `<div>${ptsBadge}</div>` : ''}
                </div>
                <div title="${visAug ? visAug.title : ''}">${visAug ? visAug.html : `<span class="text-gray-500">${getTeamAcronym(m.visitor)} -</span>`}</div>
              </div>
            `;
          } else if (usrMatch && usrMatch.local && usrMatch.visitor) {
            cellContent = `
              <div class="flex items-center justify-between gap-1">
                <div class="text-[10px] text-gray-400 font-semibold leading-none" title="Pronóstico en porra: ${usrMatch.local} vs ${usrMatch.visitor} (Gana ${usrMatch.winner})">${getTeamAcronym(usrMatch.local)} vs ${getTeamAcronym(usrMatch.visitor)}</div>
                ${ptsBadge ? `<div>${ptsBadge}</div>` : ''}
              </div>
            `;
          } else {
            cellContent = `<div class="text-center">${ptsBadge || '-'}</div>`;
          }
          
          bodyHtml += `<td class="py-3 px-4 text-xs font-bold text-white ${focusCellBg}">${cellContent}</td>`;
        }
      }
    });
    
    bodyHtml += '</tr>';
  });
  
  tbody.innerHTML = bodyHtml;
}

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

// ==========================================
// Three.js 3D Hero Soccer Ball (Dashboard)
// ==========================================
function initDashboardHeroBall() {
  const canvas = document.getElementById('dashboard-ball-canvas');
  const container = document.getElementById('dashboard-ball-container');
  if (!canvas || !container) return;
  
  const scene = new THREE.Scene();
  
  const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.z = 5.0;
  
  const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  
  // Ball texture generation (procedural Adidas Trionda design)
  function drawTriondaBallTexture(texCanvas, isBumpMap) {
    const w = texCanvas.width;
    const h = texCanvas.height;
    const ctx = texCanvas.getContext('2d');
    const scale = w / 1024;
    
    if (isBumpMap) {
      ctx.fillStyle = '#808080'; // middle gray for bump
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.fillStyle = '#F4F4F6'; // off-white leather base
      ctx.fillRect(0, 0, w, h);
    }
    
    // Helper for rounded rect
    function roundedRect(c, x, y, width, height, r, fill, stroke) {
      c.beginPath();
      c.moveTo(x + r, y);
      c.lineTo(x + width - r, y);
      c.quadraticCurveTo(x + width, y, x + width, y + r);
      c.lineTo(x + width, y + height - r);
      c.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
      c.lineTo(x + r, y + height);
      c.quadraticCurveTo(x, y + height, x, y + height - r);
      c.lineTo(x, y + r);
      c.quadraticCurveTo(x, y, x + r, y);
      c.closePath();
      if (fill) c.fill();
      if (stroke) c.stroke();
    }

    // Helper to draw a star
    function drawStar(c, cx, cy, spikes, outerRadius, innerRadius, color) {
      let rot = Math.PI / 2 * 3;
      let x = cx;
      let y = cy;
      let step = Math.PI / spikes;

      c.beginPath();
      c.moveTo(cx, cy - outerRadius);
      for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        c.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        c.lineTo(x, y);
        rot += step;
      }
      c.lineTo(cx, cy - outerRadius);
      c.closePath();
      c.fillStyle = color;
      c.fill();
    }

    // Helper to draw maple leaf
    function drawMapleLeaf(c, x, y, size, color) {
      c.fillStyle = color;
      c.beginPath();
      c.moveTo(x, y - size);
      c.lineTo(x + size*0.2, y - size*0.5);
      c.lineTo(x + size*0.5, y - size*0.7);
      c.lineTo(x + size*0.4, y - size*0.3);
      c.lineTo(x + size*0.8, y - size*0.4);
      c.lineTo(x + size*0.5, y - size*0.1);
      c.lineTo(x + size*0.6, y + size*0.2);
      c.lineTo(x + size*0.2, y + size*0.1);
      c.lineTo(x + size*0.1, y + size*0.5);
      c.lineTo(x + size*0.05, y + size*0.3);
      c.lineTo(x, y + size*0.6);
      c.lineTo(x - size*0.05, y + size*0.3);
      c.lineTo(x - size*0.1, y + size*0.5);
      c.lineTo(x - size*0.2, y + size*0.1);
      c.lineTo(x - size*0.6, y + size*0.2);
      c.lineTo(x - size*0.5, y - size*0.1);
      c.lineTo(x - size*0.8, y - size*0.4);
      c.lineTo(x - size*0.4, y - size*0.3);
      c.lineTo(x - size*0.5, y - size*0.7);
      c.lineTo(x - size*0.2, y - size*0.5);
      c.closePath();
      c.fill();
    }

    // Helper to draw panel (clipped using temporary canvas)
    function drawClippedPanel(cx, cy, r, start, end, width, colorGradStart, colorGradEnd, drawInner) {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = w;
      tempCanvas.height = h;
      const tempCtx = tempCanvas.getContext('2d');
      
      // Draw sweep background
      tempCtx.beginPath();
      tempCtx.arc(cx * scale, cy * scale, r * scale, start, end);
      
      const grad = tempCtx.createLinearGradient(
        (cx - r) * scale, (cy - r) * scale, 
        (cx + r) * scale, (cy + r) * scale
      );
      grad.addColorStop(0, colorGradStart);
      grad.addColorStop(1, colorGradEnd);
      
      tempCtx.strokeStyle = grad;
      tempCtx.lineWidth = width * scale;
      tempCtx.lineCap = 'round';
      tempCtx.stroke();
      
      // Clip to drawing
      tempCtx.globalCompositeOperation = 'source-atop';
      
      // Call inner drawing logic
      drawInner(tempCtx, scale);
      
      // Draw back to main canvas
      ctx.drawImage(tempCanvas, 0, 0);
    }

    if (!isBumpMap) {
      // Draw Green Panel (Mexico - Agave Leaf & Trionda Text)
      drawClippedPanel(200, 360, 130, -Math.PI * 0.8, Math.PI * 0.2, 80, '#3CAC3B', '#125411', (pCtx, s) => {
        // Draw agave leaf stripes
        pCtx.strokeStyle = 'rgba(0,0,0,0.18)';
        pCtx.lineWidth = 4 * s;
        for (let i = -5; i <= 5; i++) {
          pCtx.beginPath();
          pCtx.arc((200 + i*15) * s, 360 * s, 110 * s, -Math.PI, 0);
          pCtx.stroke();
        }
        // Draw Trionda label plate
        pCtx.fillStyle = 'rgba(0,0,0,0.7)';
        roundedRect(pCtx, 140 * s, 340 * s, 120 * s, 45 * s, 8 * s, true, false);
        
        pCtx.fillStyle = '#FFF';
        pCtx.font = `bold ${16 * s}px 'Outfit', sans-serif`;
        pCtx.textAlign = 'center';
        pCtx.fillText('TRIONDA', 200 * s, 360 * s);
        
        pCtx.fillStyle = '#F59E0B';
        pCtx.font = `800 ${8 * s}px 'Outfit', sans-serif`;
        pCtx.fillText('PRO', 200 * s, 370 * s);
        
        pCtx.fillStyle = '#FFF';
        pCtx.font = `${5 * s}px sans-serif`;
        pCtx.fillText('BALÓN OFICIAL DEL PARTIDO', 200 * s, 378 * s);
      });

      // Draw Blue Panel (USA - Stars & FWC Logo)
      drawClippedPanel(512, 160, 120, Math.PI * 0.1, Math.PI * 1.1, 80, '#2A398D', '#111847', (pCtx, s) => {
        // Draw stars
        for (let i = 0; i < 8; i++) {
          const starX = 512 + Math.sin(i * 0.8) * 80;
          const starY = 160 + Math.cos(i * 0.8) * 40;
          drawStar(pCtx, starX * s, starY * s, 5, 8 * s, 4 * s, '#38BDF8');
        }
        
        // Draw FWC logo plate
        pCtx.fillStyle = '#FFF';
        roundedRect(pCtx, 482 * s, 135 * s, 60 * s, 50 * s, 6 * s, true, false);
        
        pCtx.fillStyle = '#2A398D';
        pCtx.font = `bold ${10 * s}px 'Outfit', sans-serif`;
        pCtx.textAlign = 'center';
        pCtx.fillText('2026', 512 * s, 150 * s);
        pCtx.font = `bold ${6 * s}px sans-serif`;
        pCtx.fillText('FIFA', 512 * s, 175 * s);
        
        // Gold trophy shape
        pCtx.fillStyle = '#F59E0B';
        pCtx.beginPath();
        pCtx.moveTo(509 * s, 165 * s);
        pCtx.lineTo(515 * s, 165 * s);
        pCtx.lineTo(514 * s, 156 * s);
        pCtx.lineTo(516 * s, 153 * s);
        pCtx.lineTo(508 * s, 153 * s);
        pCtx.lineTo(510 * s, 156 * s);
        pCtx.closePath();
        pCtx.fill();
      });

      // Draw Red Panel (Canada - Maple Leaves)
      drawClippedPanel(820, 360, 130, -Math.PI * 0.7, Math.PI * 0.3, 80, '#E61D25', '#7A0C10', (pCtx, s) => {
        // Draw maple leaves
        drawMapleLeaf(pCtx, 820 * s, 360 * s, 25 * s, '#F59E0B');
        drawMapleLeaf(pCtx, 770 * s, 330 * s, 16 * s, '#4A0002');
        drawMapleLeaf(pCtx, 870 * s, 370 * s, 14 * s, '#4A0002');
      });

      // Draw Adidas Red Logo
      ctx.fillStyle = '#E61D25';
      const adX = 360 * scale;
      const adY = 220 * scale;
      const adS = 22 * scale;
      
      ctx.beginPath();
      ctx.moveTo(adX - adS*0.5, adY + adS*0.5); ctx.lineTo(adX - adS*0.3, adY - adS*0.1); ctx.lineTo(adX - adS*0.1, adY - adS*0.1); ctx.lineTo(adX - adS*0.3, adY + adS*0.5); ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(adX - adS*0.1, adY + adS*0.5); ctx.lineTo(adX + adS*0.2, adY - adS*0.4); ctx.lineTo(adX + adS*0.4, adY - adS*0.4); ctx.lineTo(adX + adS*0.1, adY + adS*0.5); ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(adX + adS*0.3, adY + adS*0.5); ctx.lineTo(adX + adS*0.7, adY - adS*0.7); ctx.lineTo(adX + adS*0.9, adY - adS*0.7); ctx.lineTo(adX + adS*0.5, adY + adS*0.5); ctx.closePath(); ctx.fill();

      // Draw FIFA Quality Badge
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1 * scale;
      ctx.fillStyle = '#fff';
      roundedRect(ctx, 640 * scale, 210 * scale, 40 * scale, 24 * scale, 3 * scale, true, true);
      ctx.fillStyle = '#000';
      ctx.font = `bold ${8 * scale}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('FIFA', 660 * scale, 222 * scale);
      ctx.font = `${4 * scale}px sans-serif`;
      ctx.fillText('QUALITY PRO', 660 * scale, 229 * scale);
    }

    // Draw Panel Seams
    const seamColor = isBumpMap ? '#000000' : 'rgba(0, 0, 0, 0.15)';
    const seamWidth = isBumpMap ? 6 * scale : 2.5 * scale;
    
    ctx.strokeStyle = seamColor;
    ctx.lineWidth = seamWidth;
    ctx.lineCap = 'round';
    
    // Seam 1 (wavy horizontal 1)
    ctx.beginPath();
    ctx.moveTo(0, 150 * scale);
    ctx.bezierCurveTo(256 * scale, 300 * scale, 768 * scale, 50 * scale, 1024 * scale, 150 * scale);
    ctx.stroke();
    
    // Seam 2 (wavy horizontal 2)
    ctx.beginPath();
    ctx.moveTo(0, 362 * scale);
    ctx.bezierCurveTo(256 * scale, 462 * scale, 768 * scale, 212 * scale, 1024 * scale, 362 * scale);
    ctx.stroke();
    
    // Vertical seams
    for (let i = 0; i < 4; i++) {
      const x = i * 256 * scale;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + 100 * scale, 150 * scale, x - 100 * scale, 362 * scale, x, h);
      ctx.stroke();
    }

    // Noise texture for bump details
    if (isBumpMap) {
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 22;
        data[i] = Math.min(255, Math.max(0, data[i] + noise));
        data[i+1] = Math.min(255, Math.max(0, data[i+1] + noise));
        data[i+2] = Math.min(255, Math.max(0, data[i+2] + noise));
      }
      ctx.putImageData(imgData, 0, 0);
    }
  }
  
  function createBallTexture() {
    const texCanvas = document.createElement('canvas');
    texCanvas.width = 512;
    texCanvas.height = 256;
    drawTriondaBallTexture(texCanvas, false);
    return new THREE.CanvasTexture(texCanvas);
  }
  
  function createBallBump() {
    const texCanvas = document.createElement('canvas');
    texCanvas.width = 512;
    texCanvas.height = 256;
    drawTriondaBallTexture(texCanvas, true);
    return new THREE.CanvasTexture(texCanvas);
  }
  
  const ballMesh = new THREE.Mesh(
    new THREE.SphereGeometry(1.6, 48, 48),
    new THREE.MeshStandardMaterial({
      map: createBallTexture(),
      bumpMap: createBallBump(),
      bumpScale: 0.04,
      metalness: 0.15,
      roughness: 0.4,
      clearcoat: 0.2
    })
  );
  scene.add(ballMesh);
  
  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.45));
  
  const bL = new THREE.DirectionalLight(0x2A398D, 1.5);
  bL.position.set(-4, 2, -2);
  scene.add(bL);
  
  const gL = new THREE.DirectionalLight(0x3CAC3B, 1.2);
  gL.position.set(4, -2, 2);
  scene.add(gL);
  
  const dL = new THREE.DirectionalLight(0xffffff, 1.2);
  dL.position.set(3, 4, 3);
  scene.add(dL);
  
  let targetX = 0, targetY = 0;
  
  container.style.cursor = 'pointer';
  container.addEventListener('click', () => {
    window.location.href = '/arcade.html';
  });
  
  document.addEventListener('mousemove', (e) => {
    const halfX = window.innerWidth / 2;
    const halfY = window.innerHeight / 2;
    targetY = ((e.clientX - halfX)/halfX)*0.7;
    targetX = ((e.clientY - halfY)/halfY)*0.7;
  });
  
  window.addEventListener('deviceorientation', (e) => {
    if (e.beta !== null && e.gamma !== null) {
      targetY = (e.gamma / 45) * 0.7;
      targetX = ((e.beta - 45)/ 45) * 0.7;
    }
  });
  
  function draw() {
    requestAnimationFrame(draw);
    ballMesh.rotation.y += (targetY - ballMesh.rotation.y)*0.05 + 0.003;
    ballMesh.rotation.x += (targetX - ballMesh.rotation.x)*0.05 + 0.001;
    renderer.render(scene, camera);
  }
  draw();
  
  window.addEventListener('resize', () => {
    if (container.clientWidth) {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    }
  });
}

// ==========================================
// Three.js 3D World Cup Trophy (Podium #1)
// ==========================================
function initWorldCupTrophy3D() {
  // Cancel active animation to prevent loop piling
  if (activeTrophyAnimId) {
    cancelAnimationFrame(activeTrophyAnimId);
    activeTrophyAnimId = null;
  }
  
  const canvas = document.getElementById('trophy-3d-canvas');
  const container = document.getElementById('trophy-3d-container');
  if (!canvas || !container) return;
  
  const w = container.clientWidth || 64;
  const h = container.clientHeight || 72;
  
  const scene = new THREE.Scene();
  
  const camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 10);
  camera.position.set(0, 1.05, 3.4);
  camera.lookAt(0, 0.95, 0);
  
  const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  
  // Materials (using Phong to prevent black rendering in dark skyboxes/environments)
  const goldMaterial = new THREE.MeshPhongMaterial({
    color: 0xF59E0B, // FWC Gold
    specular: 0xFFE082, // warm gold specular highlights
    shininess: 90
  });
  
  const greenMaterial = new THREE.MeshPhongMaterial({
    color: 0x005A1C, // Rich malachite green
    specular: 0x3CAC3B, // neon green highlight
    shininess: 50
  });
  
  const trophyGroup = new THREE.Group();
  
  // 1. Stacked Conical Base (Malachite Rings & Gold base plates)
  // Gold Bottom Plate (thick rim)
  const baseRim = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.35, 0.04, 24), goldMaterial);
  baseRim.position.y = 0.02;
  trophyGroup.add(baseRim);
  
  // Green Bottom Ring (Malachite)
  const baseRing1 = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.34, 0.06, 24), greenMaterial);
  baseRing1.position.y = 0.07;
  trophyGroup.add(baseRing1);
  
  // Gold Middle Section (engraved rim)
  const baseMiddle = new THREE.Mesh(new THREE.CylinderGeometry(0.315, 0.33, 0.08, 24), goldMaterial);
  baseMiddle.position.y = 0.14;
  trophyGroup.add(baseMiddle);
  
  // Green Top Ring (Malachite)
  const baseRing2 = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.315, 0.06, 24), greenMaterial);
  baseRing2.position.y = 0.21;
  trophyGroup.add(baseRing2);
  
  // Gold base cap/stem connector
  const baseCap = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.30, 0.06, 24), goldMaterial);
  baseCap.position.y = 0.27;
  trophyGroup.add(baseCap);
  
  // 2. Gold Lathe Stem (starting at y=0.30)
  const points = [];
  points.push(new THREE.Vector2(0.01, 0.30));
  points.push(new THREE.Vector2(0.23, 0.30));
  points.push(new THREE.Vector2(0.21, 0.45));
  points.push(new THREE.Vector2(0.24, 0.65));
  points.push(new THREE.Vector2(0.31, 0.85));
  points.push(new THREE.Vector2(0.36, 1.05));
  points.push(new THREE.Vector2(0.21, 1.23));
  points.push(new THREE.Vector2(0.01, 1.25));
  
  const stem = new THREE.Mesh(new THREE.LatheGeometry(points, 24), goldMaterial);
  trophyGroup.add(stem);
  
  // 3. Stylized Human Figures / Arms wrapping up
  const curve1 = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.08, 0.38, 0.05),
    new THREE.Vector3(0.20, 0.65, 0.12),
    new THREE.Vector3(0.24, 0.95, 0.08),
    new THREE.Vector3(0.21, 1.20, 0.02)
  ]);
  const tube1 = new THREE.Mesh(new THREE.TubeGeometry(curve1, 16, 0.065, 8, false), goldMaterial);
  trophyGroup.add(tube1);
  
  const curve2 = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.08, 0.38, -0.05),
    new THREE.Vector3(-0.20, 0.65, -0.12),
    new THREE.Vector3(-0.24, 0.95, -0.08),
    new THREE.Vector3(-0.21, 1.20, -0.02)
  ]);
  const tube2 = new THREE.Mesh(new THREE.TubeGeometry(curve2, 16, 0.065, 8, false), goldMaterial);
  trophyGroup.add(tube2);
  
  // 4. Globe top with raised continents
  function createGlobeTexture() {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 128;
    const tempCtx = c.getContext('2d');
    
    // Ocean background (darker textured gold)
    tempCtx.fillStyle = '#C89300';
    tempCtx.fillRect(0, 0, 256, 128);
    
    // Ocean ripples texture
    tempCtx.fillStyle = 'rgba(0,0,0,0.06)';
    for (let i = 0; i < 30; i++) {
      tempCtx.fillRect(Math.random() * 256, Math.random() * 128, 6, 2);
    }
    
    // Americas (West)
    tempCtx.fillStyle = '#EEB000'; // Bright polished gold
    tempCtx.beginPath();
    tempCtx.moveTo(20, 20);
    tempCtx.lineTo(60, 25);
    tempCtx.lineTo(55, 45);
    tempCtx.lineTo(40, 55);
    tempCtx.lineTo(50, 75);
    tempCtx.lineTo(45, 105);
    tempCtx.lineTo(35, 110);
    tempCtx.lineTo(25, 70);
    tempCtx.lineTo(30, 50);
    tempCtx.closePath();
    tempCtx.fill();
    
    // Africa & Europe & Asia (East)
    tempCtx.beginPath();
    tempCtx.moveTo(110, 20);
    tempCtx.lineTo(160, 15);
    tempCtx.lineTo(210, 25);
    tempCtx.lineTo(220, 75);
    tempCtx.lineTo(180, 80);
    tempCtx.lineTo(160, 60);
    tempCtx.lineTo(150, 95);
    tempCtx.lineTo(125, 105);
    tempCtx.lineTo(115, 75);
    tempCtx.lineTo(100, 45);
    tempCtx.closePath();
    tempCtx.fill();
    
    // Australia
    tempCtx.beginPath();
    tempCtx.arc(205, 95, 12, 0, Math.PI * 2);
    tempCtx.fill();
    
    return new THREE.CanvasTexture(c);
  }

  const globeMap = createGlobeTexture();
  const globeMaterial = new THREE.MeshPhongMaterial({
    color: 0xF59E0B,
    map: globeMap,
    bumpMap: globeMap,
    bumpScale: 0.04,
    specular: 0xFFE082,
    shininess: 70
  });

  const globe = new THREE.Mesh(new THREE.SphereGeometry(0.35, 24, 24), globeMaterial);
  globe.position.y = 1.32;
  trophyGroup.add(globe);
  
  scene.add(trophyGroup);
  
  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  
  const light1 = new THREE.DirectionalLight(0xffffff, 1.4);
  light1.position.set(2, 4, 3);
  scene.add(light1);
  
  const light2 = new THREE.DirectionalLight(0x3CAC3B, 0.7); // Green neon glow reflection
  light2.position.set(-2, 1, 1);
  scene.add(light2);
  
  function anim() {
    activeTrophyAnimId = requestAnimationFrame(anim);
    trophyGroup.rotation.y += 0.014;
    renderer.render(scene, camera);
  }
  anim();
}
