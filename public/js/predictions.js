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
  return `<img src="https://flagcdn.com/w40/${data.flag.toLowerCase()}.png" class="flag-img" alt="${teamName}">`;
}

let currentUser = null;
let allMatches = [];
let userPredictions = { matches: {}, specials: {} };
let draftPredictions = { matches: {}, specials: {} };
let isLocked = false;
let isGroupsLocked = false;
let isKnockoutsLocked = false;
let isAwardsLocked = false;
let currentTab = 'timeline';
let currentMobileRound = 'r32-col';

// Initialize Page
document.addEventListener("DOMContentLoaded", async () => {
  await verifySession();
  await loadDeadline();
  await loadMatchesAndPredictions();
});

// Verify user session
async function verifySession() {
  const res = await fetch('/api/auth/me');
  const data = await res.json();
  if (!data.user) {
    window.location.href = '/index.html';
  } else {
    currentUser = data.user;
    document.getElementById('user-greeting').innerText = `¡Hola, ${currentUser.username}!`;
    const greetingMob = document.getElementById('user-greeting-mobile');
    if (greetingMob) greetingMob.innerText = `¡Hola, ${currentUser.username}!`;
    if (currentUser.isAdmin) {
      document.getElementById('admin-nav-link').style.display = 'inline-block';
      const adminNavMob = document.getElementById('admin-nav-link-mobile');
      if (adminNavMob) adminNavMob.style.display = 'inline-block';
    }
  }
}

// Load deadline countdown
async function loadDeadline() {
  const res = await fetch('/api/predictions/deadline');
  const data = await res.json();
  
  // Administrators can always edit their predictions
  isLocked = data.isPassed && !currentUser.isAdmin;
  isGroupsLocked = isLocked;
  isKnockoutsLocked = isLocked;
  isAwardsLocked = isLocked;
  
  if (data.isPassed) {
    document.getElementById('deadline-container').className = "countdown-box expired";
    document.getElementById('countdown-clock').innerText = "CERRADO";
  } else {
    startCountdown(data.epoch);
  }
}

function startCountdown(targetTime) {
  const clock = document.getElementById('countdown-clock');
  function update() {
    const diff = targetTime - Date.now();
    if (diff <= 0) {
      clock.innerText = "CERRADO";
      location.reload();
      return;
    }
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);
    clock.innerText = `${days}d ${hours}h ${mins}m ${secs}s`;
  }
  update();
  setInterval(update, 1000);
}

// Switch between tabs
function switchTab(tabName) {
  currentTab = tabName;
  document.querySelectorAll('.phase-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => {
    c.classList.add('hidden');
    c.classList.remove('block');
    c.style.display = 'none';
  });
  
  if (tabName === 'groups') {
    const tabBtn = document.querySelector('.phase-tab:nth-child(1)');
    if (tabBtn) tabBtn.classList.add('active');
    const el = document.getElementById('tab-groups');
    if (el) { el.classList.remove('hidden'); el.classList.add('block'); el.style.display = 'block'; }
  } else if (tabName === 'knockouts') {
    const tabBtn = document.querySelector('.phase-tab:nth-child(2)');
    if (tabBtn) tabBtn.classList.add('active');
    const el = document.getElementById('tab-knockouts');
    if (el) { el.classList.remove('hidden'); el.classList.add('block'); el.style.display = 'block'; }
  } else if (tabName === 'awards') {
    const tabBtn = document.querySelector('.phase-tab:nth-child(3)');
    if (tabBtn) tabBtn.classList.add('active');
    const el = document.getElementById('tab-awards');
    if (el) { el.classList.remove('hidden'); el.classList.add('block'); el.style.display = 'block'; }
  } else if (tabName === 'timeline') {
    const tabBtn = document.querySelector('.phase-tab:nth-child(4)');
    if (tabBtn) tabBtn.classList.add('active');
    const el = document.getElementById('tab-timeline');
    if (el) { el.classList.remove('hidden'); el.classList.add('block'); el.style.display = 'block'; }
    renderTimeline();
    scrollToThirdToLastPlayedMatch();
  }
}

// Load matches data and participant predictions
async function loadMatchesAndPredictions() {
  try {
    const matchRes = await fetch('/api/matches');
    allMatches = await matchRes.json();
    
    const predRes = await fetch(`/api/predictions/${currentUser.id}`);
    userPredictions = await predRes.json();
    
    // Read individual section lock status from API response
    const locks = userPredictions.locks || { groups: isLocked, knockouts: isLocked, awards: isLocked };
    isGroupsLocked = locks.groups;
    isKnockoutsLocked = locks.knockouts;
    isAwardsLocked = locks.awards;
    
    // Update banner & save bar display based on section locks
    const banner = document.getElementById('readonly-message-banner');
    const saveBar = document.getElementById('save-bar');
    const allLocked = isGroupsLocked && isKnockoutsLocked && isAwardsLocked;
    
    if (allLocked) {
      if (banner) {
        banner.innerHTML = `🔒 PREDICCIONES CERRADAS: La fecha límite del 13/06/2026 a las 21:00 ha expirado. Todos los campos están en modo de solo lectura.`;
        banner.className = "readonly-banner";
        banner.style.display = 'block';
      }
      if (saveBar) saveBar.style.display = 'none';
    } else if (currentUser.isAdmin) {
      if (banner) {
        banner.innerHTML = `
          <div style="background: rgba(46, 204, 113, 0.15); border: 1px solid var(--primary); padding: 12px; border-radius: 8px; text-align: center; color: #fff; font-weight: 600; font-size: 0.9rem;">
            ⚽ Modo Administrador: La fecha límite ha pasado, pero tienes permiso para modificar tus pronósticos.
          </div>
        `;
        banner.style.display = 'block';
      }
      if (saveBar) saveBar.style.display = 'flex';
    } else {
      // Regular user with some section overrides
      const unlockedNames = [];
      if (!isGroupsLocked) unlockedNames.push("Fase de Grupos");
      if (!isKnockoutsLocked) unlockedNames.push("Fase Eliminatoria");
      if (!isAwardsLocked) unlockedNames.push("Premios Especiales");
      
      if (banner) {
        banner.innerHTML = `
          <div style="background: rgba(46, 204, 113, 0.15); border: 1px solid var(--primary); padding: 12px; border-radius: 8px; text-align: center; color: #fff; font-weight: 600; font-size: 0.9rem;">
            🔓 Tienes un desbloqueo temporal para editar las secciones: <strong>${unlockedNames.join(", ")}</strong>.
          </div>
        `;
        banner.style.display = 'block';
      }
      if (saveBar) saveBar.style.display = 'flex';
    }
    
    // Deep copy for draft
    draftPredictions = JSON.parse(JSON.stringify(userPredictions));
    if (!draftPredictions.matches) draftPredictions.matches = {};
    if (!draftPredictions.specials) draftPredictions.specials = {};
    
    renderGroups();
    renderAwards();
    recalculateAll();
    switchTab('timeline');
    updateSaveBar();
  } catch (err) {
    console.error("Error loading data:", err);
    showToast("Error al cargar los datos.", true);
  }
}

// Render Group stage matches
function renderGroups() {
  const container = document.getElementById('groups-container');
  container.innerHTML = '';
  
  // Group matches by their Group A-L
  const groups = ['A','B','C','D','E','F','G','H','I','J','K','L'];
  
  groups.forEach(g => {
    const groupCard = document.createElement('div');
    groupCard.className = 'card group-card';
    
    const groupMatches = allMatches.filter(m => m.phase === 'Group Stage' && m.group === g);
    
    let matchesHtml = '';
    groupMatches.forEach(m => {
      const pred = draftPredictions.matches[m.id] || { gl: '', gv: '' };
      const flagL = getFlagImgHtml(m.local);
      const flagV = getFlagImgHtml(m.visitor);
      const disabledAttr = isGroupsLocked ? 'disabled' : '';
      
      const realResultHtml = (m.gl !== null && m.gv !== null) ? `<span style="color: var(--accent-gold); font-weight: 800; font-size: 0.75rem;">Real: ${m.gl} - ${m.gv}</span>` : '';
      
      matchesHtml += `
        <div class="match-card">
          <div class="match-header">
            <span>Partido ${m.id}</span>
            ${realResultHtml}
            <span>Grupo ${g}</span>
          </div>
          <div class="match-body">
            <div class="team-wrapper">
              <span class="flag">${flagL}</span>
              <span class="team-name" title="${m.local}">${m.local}</span>
            </div>
            <div class="score-inputs">
              <input type="text" pattern="[0-9]*" class="score-input" value="${pred.gl ?? ''}" oninput="onScoreChange('${m.id}', 'gl', this.value)" ${disabledAttr}>
              <span class="score-divider">-</span>
              <input type="text" pattern="[0-9]*" class="score-input" value="${pred.gv ?? ''}" oninput="onScoreChange('${m.id}', 'gv', this.value)" ${disabledAttr}>
            </div>
            <div class="team-wrapper visitor">
              <span class="team-name" title="${m.visitor}">${m.visitor}</span>
              <span class="flag">${flagV}</span>
            </div>
          </div>
        </div>
      `;
    });
    
    groupCard.innerHTML = `
      <h3 class="group-title">Grupo ${g}</h3>
      <div class="group-matches">
        ${matchesHtml}
      </div>
      <table class="group-standings-table">
        <thead>
          <tr>
            <th style="width: 30px;">#</th>
            <th style="text-align: left;">Equipo</th>
            <th style="width: 35px;">Pts</th>
            <th style="width: 35px;">GF</th>
            <th style="width: 35px;">DG</th>
          </tr>
        </thead>
        <tbody id="standings-body-${g}">
          <!-- Standings populated dynamically -->
        </tbody>
      </table>
    `;
    container.appendChild(groupCard);
  });
}

// Update draft score
function onScoreChange(matchId, field, val) {
  // Allow only digits or empty string
  if (val !== '' && !/^\d+$/.test(val)) return;
  
  if (!draftPredictions.matches[matchId]) {
    draftPredictions.matches[matchId] = { gl: '', gv: '', pkl: '', pkv: '' };
  }
  
  draftPredictions.matches[matchId][field] = val === '' ? '' : parseInt(val);
  
  // Recalculate standings, third-place ranking and advance bracket
  recalculateAll();
  updateSaveBar();
}

function onPKChange(matchId, field, val) {
  if (val !== '' && !/^\d+$/.test(val)) return;
  
  if (!draftPredictions.matches[matchId]) {
    draftPredictions.matches[matchId] = { gl: '', gv: '', pkl: '', pkv: '' };
  }
  
  draftPredictions.matches[matchId][field] = val === '' ? '' : parseInt(val);
  
  recalculateAll();
  updateSaveBar();
}

// Recalculate standings and bracket matchups
function recalculateAll() {
  const groupStandings = calculateAllGroupStandings();
  renderAllStandingsTables(groupStandings);
  
  const thirdsRanking = rankThirdPlaces(groupStandings);
  renderThirdsTable(thirdsRanking);
  advanceBracket(groupStandings, thirdsRanking);
  
  if (currentTab === 'timeline') {
    renderTimeline();
  }
}

// Render the 12 third-place teams table dynamically
function renderThirdsTable(thirds) {
  const tbody = document.getElementById('thirds-table-body');
  const card = document.getElementById('thirds-ranking-card');
  if (!tbody || !card) return;
  
  let html = '';
  thirds.forEach((t, idx) => {
    const isAdvancing = idx < 8; // Top 8 thirds advance
    const flagHtml = getFlagImgHtml(t.team);
    const rowClass = isAdvancing ? 'standing-row-1' : 'standing-row-eliminated';
    const statusText = isAdvancing ? '✅ Clasificado' : '❌ Eliminado';
    
    html += `
      <tr class="${rowClass}">
        <td style="font-weight: 700; text-align: center;">${idx + 1}</td>
        <td style="font-weight: 600; text-align: center;">Grupo ${t.group}</td>
        <td style="text-align: left; font-weight: 700;">
          <span class="flag" style="margin-right: 6px;">${flagHtml}</span>${t.team}
        </td>
        <td style="font-weight: 700; text-align: center;">${t.pts}</td>
        <td style="text-align: center;">${t.gf}</td>
        <td style="font-weight: 600; text-align: center;">${t.dg > 0 ? '+' + t.dg : t.dg}</td>
        <td style="color: var(--color-text-muted); text-align: center;">#${t.fifaRank}</td>
        <td style="font-weight: 700; text-align: center;">${statusText}</td>
      </tr>
    `;
  });
  
  tbody.innerHTML = html;
  card.style.display = 'block';
}

// Calculate group standings for all groups A-L
function calculateAllGroupStandings() {
  const standings = {};
  const groups = ['A','B','C','D','E','F','G','H','I','J','K','L'];
  
  // Initialize teams stats in standings
  groups.forEach(g => {
    standings[g] = [];
    const groupMatches = allMatches.filter(m => m.phase === 'Group Stage' && m.group === g);
    // Find unique teams in matches
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
  
  // Process group match predictions
  allMatches.forEach(m => {
    if (m.phase !== 'Group Stage') return;
    const g = m.group;
    const pred = draftPredictions.matches[m.id];
    
    if (pred && pred.gl !== '' && pred.gl !== undefined && pred.gv !== '' && pred.gv !== undefined) {
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
  
  // Sort teams in each group using FIFA rules
  groups.forEach(g => {
    standings[g].sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.dg !== a.dg) return b.dg - a.dg;
      if (b.gf !== a.gf) return b.gf - a.gf;
      // Fallback: FIFA Rank (smaller value is better rank)
      return a.fifaRank - b.fifaRank;
    });
  });
  
  return standings;
}

// Render standings tables on group cards
function renderAllStandingsTables(groupStandings) {
  for (const g in groupStandings) {
    const tbody = document.getElementById(`standings-body-${g}`);
    if (!tbody) continue;
    
    let rowsHtml = '';
    groupStandings[g].forEach((t, idx) => {
      const flagHtml = getFlagImgHtml(t.team);
      const className = idx === 0 ? 'standing-row-1' : (idx === 1 ? 'standing-row-2' : '');
      rowsHtml += `
        <tr class="${className}">
          <td style="font-weight: 700;">${idx + 1}</td>
          <td class="team-cell"><span class="flag" style="margin-right: 6px;">${flagHtml}</span>${t.team}</td>
          <td style="font-weight: 700;">${t.pts}</td>
          <td>${t.gf}</td>
          <td style="font-weight: 600;">${t.dg > 0 ? '+' + t.dg : t.dg}</td>
        </tr>
      `;
    });
    tbody.innerHTML = rowsHtml;
  }
}

// Rank the 12 third-place teams to find top 8
// Check if all 6 matches of group g have a prediction
function isGroupFullyPredicted(g) {
  if (!allMatches) return false;
  const groupMatches = allMatches.filter(m => m.phase === 'Group Stage' && m.group === g);
  if (groupMatches.length === 0) return false;
  return groupMatches.every(m => {
    const pred = draftPredictions.matches[m.id];
    return pred && pred.gl !== '' && pred.gl !== undefined && pred.gl !== null &&
                  pred.gv !== '' && pred.gv !== undefined && pred.gv !== null;
  });
}

// Rank the 12 third-place teams to find top 8
function rankThirdPlaces(groupStandings) {
  const thirds = [];
  
  for (const g in groupStandings) {
    const t3 = groupStandings[g][2]; // 3rd position (index 2)
    if (t3) {
      const isCompleted = isGroupFullyPredicted(g);
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
  
  // Sort third places
  thirds.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.dg !== a.dg) return b.dg - a.dg;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return a.fifaRank - b.fifaRank;
  });
  
  return thirds;
}

// Bracket advancement logic — now renders a VISUAL BRACKET (llave)
function advanceBracket(groupStandings, thirdsRanking) {
  const top8Thirds = thirdsRanking.slice(0, 8);
  
  // Map advancement teams (Round of 32 definitions)
  const advanceTeams = {
    // Top 8 thirds placeholders
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

  const groups = ['A','B','C','D','E','F','G','H','I','J','K','L'];
  groups.forEach(g => {
    const isCompleted = isGroupFullyPredicted(g);
    advanceTeams[`1${g}`] = isCompleted ? (groupStandings[g][0]?.team || `1º Grupo ${g}`) : `1º Grupo ${g}`;
    advanceTeams[`2${g}`] = isCompleted ? (groupStandings[g][1]?.team || `2º Grupo ${g}`) : `2º Grupo ${g}`;
    advanceTeams[`3${g}`] = isCompleted ? (groupStandings[g][2]?.team || `3º Grupo ${g}`) : `3º Grupo ${g}`;
  });
  
  // Match definitions for Round of 32 (D1 to D16, IDs M73 to M88)
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
  
  const bracketTeams = {}; // Match winners mapping
  
  // 1. Process Round of 32 winners
  const r32Data = r32Matches.map(m => {
    const localTeam = advanceTeams[m.lRef];
    const visitorTeam = advanceTeams[m.vRef];
    const pred = draftPredictions.matches[m.id] || { gl: '', gv: '', pkl: '', pkv: '' };
    const winner = getWinnerOfMatch(localTeam, visitorTeam, pred.gl, pred.gv, pred.pkl, pred.pkv);
    bracketTeams[m.label] = winner;
    return { ...m, local: localTeam, visitor: visitorTeam, pred, winner };
  });

  // 2. Process Round of 16
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

  const r16Data = r16Matches.map(m => {
    const localTeam = bracketTeams[m.lRef] || `Ganador ${m.lRef}`;
    const visitorTeam = bracketTeams[m.vRef] || `Ganador ${m.vRef}`;
    const pred = draftPredictions.matches[m.id] || { gl: '', gv: '', pkl: '', pkv: '' };
    const winner = getWinnerOfMatch(localTeam, visitorTeam, pred.gl, pred.gv, pred.pkl, pred.pkv);
    bracketTeams[m.label] = winner;
    return { ...m, local: localTeam, visitor: visitorTeam, pred, winner };
  });

  // 3. Process Quarterfinals
  const r8Matches = [
    { id: "M97", label: "C1", lRef: "O1", vRef: "O2" },
    { id: "M98", label: "C2", lRef: "O3", vRef: "O4" },
    { id: "M99", label: "C3", lRef: "O5", vRef: "O6" },
    { id: "M100", label: "C4", lRef: "O7", vRef: "O8" }
  ];

  const r8Data = r8Matches.map(m => {
    const localTeam = bracketTeams[m.lRef] || `Ganador ${m.lRef}`;
    const visitorTeam = bracketTeams[m.vRef] || `Ganador ${m.vRef}`;
    const pred = draftPredictions.matches[m.id] || { gl: '', gv: '', pkl: '', pkv: '' };
    const winner = getWinnerOfMatch(localTeam, visitorTeam, pred.gl, pred.gv, pred.pkl, pred.pkv);
    bracketTeams[m.label] = winner;
    return { ...m, local: localTeam, visitor: visitorTeam, pred, winner };
  });

  // 4. Process Semifinals
  const s1Local = bracketTeams["C1"] || "Ganador C1";
  const s1Visitor = bracketTeams["C2"] || "Ganador C2";
  const s2Local = bracketTeams["C3"] || "Ganador C3";
  const s2Visitor = bracketTeams["C4"] || "Ganador C4";

  const s1Pred = draftPredictions.matches["M101"] || { gl: '', gv: '', pkl: '', pkv: '' };
  const s2Pred = draftPredictions.matches["M102"] || { gl: '', gv: '', pkl: '', pkv: '' };

  const s1Winner = getWinnerOfMatch(s1Local, s1Visitor, s1Pred.gl, s1Pred.gv, s1Pred.pkl, s1Pred.pkv);
  const s2Winner = getWinnerOfMatch(s2Local, s2Visitor, s2Pred.gl, s2Pred.gv, s2Pred.pkl, s2Pred.pkv);

  const s1Loser = getLoserOfMatch(s1Local, s1Visitor, s1Winner);
  const s2Loser = getLoserOfMatch(s2Local, s2Visitor, s2Winner);

  const sfData = [
    { id: "M101", label: "S1", local: s1Local, visitor: s1Visitor, pred: s1Pred, winner: s1Winner },
    { id: "M102", label: "S2", local: s2Local, visitor: s2Visitor, pred: s2Pred, winner: s2Winner }
  ];

  // 5. Process Final
  const finalLocal = s1Winner || "Ganador S1";
  const finalVisitor = s2Winner || "Ganador S2";
  const finalPred = draftPredictions.matches["M104"] || { gl: '', gv: '', pkl: '', pkv: '' };
  const finalWinner = getWinnerOfMatch(finalLocal, finalVisitor, finalPred.gl, finalPred.gv, finalPred.pkl, finalPred.pkv);

  const finalData = [
    { id: "M104", label: "Final", local: finalLocal, visitor: finalVisitor, pred: finalPred, winner: finalWinner, isFinal: true }
  ];

  // 6. Third place match (rendered separately)
  const t3Local = s1Loser || "Perdedor S1";
  const t3Visitor = s2Loser || "Perdedor S2";
  const t3Pred = draftPredictions.matches["M103"] || { gl: '', gv: '', pkl: '', pkv: '' };
  const t3Data = { id: "M103", label: "3er Puesto", local: t3Local, visitor: t3Visitor, pred: t3Pred, isThirdPlace: true };

  // ===================================================================
  // BUILD THE VISUAL BRACKET HTML
  // ===================================================================
  const wrapper = document.getElementById('bracket-wrapper');
  
  let html = '<div class="bracket-container">';
  
  // COLUMN: Round of 32
  html += buildRoundColumn("Dieciseisavos", "r32-col", r32Data);
  html += buildConnectorColumn(8); // 16 → 8 connectors
  
  // COLUMN: Round of 16
  html += buildRoundColumn("Octavos", "r16-col", r16Data);
  html += buildConnectorColumn(4); // 8 → 4 connectors
  
  // COLUMN: Quarterfinals
  html += buildRoundColumn("Cuartos", "r8-col", r8Data);
  html += buildConnectorColumn(2); // 4 → 2 connectors
  
  // COLUMN: Semifinals
  html += buildRoundColumn("Semifinales", "r4-col", sfData);
  html += buildConnectorColumn(1); // 2 → 1 connector
  
  // COLUMN: Final
  html += buildRoundColumn("⭐ Final", "final-col", finalData);
  
  // COLUMN: Trophy
  html += `
    <div class="bracket-round-col trophy-col">
      <div class="bracket-col-header">Campeón</div>
      <div class="bracket-trophy">
        <div class="bracket-trophy-icon">🏆</div>
        <div class="bracket-champion-name">${finalWinner || '???'}</div>
        <div class="bracket-trophy-label">Mundial 2026</div>
      </div>
    </div>
  `;
  
  html += '</div>'; // close .bracket-container
  wrapper.innerHTML = html;

  // Apply mobile visibility state
  selectMobileRound(currentMobileRound);

  // Render third-place match separately below the bracket
  const t3Container = document.getElementById('bracket-third-place-container');
  t3Container.innerHTML = `
    <div style="max-width: 320px;">
      <div style="text-align: center; margin-bottom: 8px;">
        <span style="font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1.2px; color: hsl(20, 60%, 55%);">🥉 Partido por el 3er Puesto</span>
      </div>
      ${renderBracketMatchHtml(t3Data)}
    </div>
  `;
}

// Build a round column with header + match slots
function buildRoundColumn(title, colClass, matchesData) {
  let html = `<div class="bracket-round-col ${colClass}">`;
  html += `<div class="bracket-col-header">${title}</div>`;
  
  matchesData.forEach(m => {
    html += `<div class="bracket-match-slot">${renderBracketMatchHtml(m)}</div>`;
  });
  
  html += '</div>';
  return html;
}

// Build connector column with N pairs of connecting lines
function buildConnectorColumn(pairCount) {
  let html = '<div class="bracket-connector-col">';
  for (let i = 0; i < pairCount; i++) {
    html += `
      <div class="bracket-connector-pair">
        <div class="bracket-vline"></div>
        <div class="bracket-hline-out"></div>
      </div>
    `;
  }
  html += '</div>';
  return html;
}

// Render a single bracket match card
function renderBracketMatchHtml(m) {
  const flagL = getFlagImgHtml(m.local);
  const flagV = getFlagImgHtml(m.visitor);
  const disabledAttr = isKnockoutsLocked ? 'disabled' : '';
  const pred = m.pred;

  const isPlaceholderL = !TEAM_DATA[m.local];
  const isPlaceholderV = !TEAM_DATA[m.visitor];

  // Determine if there's a tie (need penalties)
  const isTie = (pred.gl !== '' && pred.gv !== '' && pred.gl !== undefined && pred.gv !== undefined && parseInt(pred.gl) === parseInt(pred.gv));

  // Determine winner for highlighting
  const winner = m.winner;
  const localIsWinner = winner && winner === m.local;
  const visitorIsWinner = winner && winner === m.visitor;

  // Extra class for final / third place
  let extraClass = '';
  if (m.isFinal) extraClass = 'final-match';
  if (m.isThirdPlace) extraClass = 'third-place-match';

  // Check if this knockout match has a real result
  const realMatch = allMatches.find(x => x.id === m.id);
  const hasReal = realMatch && realMatch.gl !== null && realMatch.gv !== null;
  const realResultHtml = hasReal ? `<span style="color: var(--accent-gold); font-weight: 900; margin-left: 6px;">Real: ${realMatch.gl}-${realMatch.gv}${realMatch.pkl !== null ? ` (${realMatch.pkl}-${realMatch.pkv} PK)` : ''}</span>` : '';

  let html = `<div class="bracket-match ${extraClass}">`;

  // Label row
  html += `
    <div class="bracket-match-label">
      <span>${m.id} · ${m.label}${realResultHtml}</span>
    </div>
  `;

  // Local team row
  html += `
    <div class="bracket-team-row ${localIsWinner ? 'is-winner' : ''}">
      <div class="bracket-team-info">
        <span class="flag">${flagL}</span>
        <span class="bracket-team-name ${isPlaceholderL ? 'placeholder' : ''}" title="${m.local}">${m.local}</span>
      </div>
      <div class="bracket-score-cell">
        ${isTie ? `<input type="text" pattern="[0-9]*" class="bracket-pk-input" value="${pred.pkl ?? ''}" oninput="onPKChange('${m.id}', 'pkl', this.value)" placeholder="PK" ${disabledAttr}>` : ''}
        <input type="text" pattern="[0-9]*" class="bracket-score-input" value="${pred.gl ?? ''}" oninput="onScoreChange('${m.id}', 'gl', this.value)" ${disabledAttr}>
      </div>
    </div>
  `;

  // Visitor team row
  html += `
    <div class="bracket-team-row ${visitorIsWinner ? 'is-winner' : ''}">
      <div class="bracket-team-info">
        <span class="flag">${flagV}</span>
        <span class="bracket-team-name ${isPlaceholderV ? 'placeholder' : ''}" title="${m.visitor}">${m.visitor}</span>
      </div>
      <div class="bracket-score-cell">
        ${isTie ? `<input type="text" pattern="[0-9]*" class="bracket-pk-input" value="${pred.pkv ?? ''}" oninput="onPKChange('${m.id}', 'pkv', this.value)" placeholder="PK" ${disabledAttr}>` : ''}
        <input type="text" pattern="[0-9]*" class="bracket-score-input" value="${pred.gv ?? ''}" oninput="onScoreChange('${m.id}', 'gv', this.value)" ${disabledAttr}>
      </div>
    </div>
  `;

  html += '</div>'; // close .bracket-match
  return html;
}

// Render Special Awards selections (Free-text for Player Names)
function renderAwards() {
  const container = document.getElementById('specials-container');
  container.innerHTML = '';
  
  const awards = [
    { id: "balon_oro", label: "Balón de Oro (Mejor Jugador)", color: "var(--accent-gold)", icon: "👑" },
    { id: "balon_plata", label: "Balón de Plata", color: "hsl(0, 0%, 75%)", icon: "🥈" },
    { id: "balon_bronce", label: "Balón de Bronce", color: "hsl(20, 60%, 55%)", icon: "🥉" },
    { id: "bota_oro", label: "Bota de Oro (Máximo Goleador)", color: "var(--accent-gold)", icon: "⚽" },
    { id: "bota_plata", label: "Bota de Plata", color: "hsl(0, 0%, 75%)", icon: "🥈" },
    { id: "bota_bronce", label: "Bota de Bronce", color: "hsl(20, 60%, 55%)", icon: "🥉" }
  ];
  
  const disabledAttr = isAwardsLocked ? 'disabled' : '';
  
  awards.forEach(a => {
    const val = draftPredictions.specials[a.id] || "";
    
    const div = document.createElement('div');
    div.className = 'special-select-group';
    div.innerHTML = `
      <div class="card" style="padding: 16px; background: rgba(0,0,0,0.2); border-color: rgba(255,255,255,0.05); display: flex; flex-direction: column; gap: 8px;">
        <label class="form-label" for="award-input-${a.id}" style="color: ${a.color}; font-weight: 800; font-size: 0.9rem; display: flex; align-items: center; gap: 6px; margin-bottom: 0;">
          <span style="font-size: 1.2rem;">${a.icon}</span> ${a.label}
        </label>
        <input type="text" id="award-input-${a.id}" class="form-control" value="${val}" placeholder="Nombre del jugador..." oninput="onAwardInputChange('${a.id}', this.value)" ${disabledAttr} style="background: rgba(0,0,0,0.4); border-color: var(--border-color);">
      </div>
    `;
    container.appendChild(div);
  });
}

function onAwardInputChange(awardId, val) {
  draftPredictions.specials[awardId] = val;
  updateSaveBar();
}

// Floating save bar state management
function updateSaveBar() {
  if (isGroupsLocked && isKnockoutsLocked && isAwardsLocked) {
    document.getElementById('save-bar').style.display = 'none';
    return;
  }
  
  const hasUnsaved = JSON.stringify(draftPredictions) !== JSON.stringify(userPredictions);
  const bar = document.getElementById('save-bar');
  const status = document.getElementById('save-status');
  const btn = document.getElementById('save-btn');
  
  if (hasUnsaved) {
    bar.style.display = 'flex';
    status.className = "save-status-indicator unsaved";
    status.innerHTML = `<span>⚠️</span><span>Tienes cambios sin guardar en tu borrador.</span>`;
    btn.disabled = false;
  } else {
    status.className = "save-status-indicator saved";
    status.innerHTML = `<span>✅</span><span>Todos tus pronósticos están guardados.</span>`;
    btn.disabled = true;
  }
}

// Save Predictions API call
async function savePredictions() {
  if (isGroupsLocked && isKnockoutsLocked && isAwardsLocked) return;
  
  const btn = document.getElementById('save-btn');
  btn.innerText = "Guardando...";
  btn.disabled = true;
  
  try {
    const res = await fetch(`/api/predictions/${currentUser.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draftPredictions)
    });
    const data = await res.json();
    
    if (!res.ok) {
      showToast(data.error || "Error al guardar predicciones", true);
      btn.innerText = "Guardar Pronósticos";
      btn.disabled = false;
    } else {
      showToast(data.message, false);
      userPredictions = JSON.parse(JSON.stringify(draftPredictions));
      updateSaveBar();
      btn.innerText = "Guardar Pronósticos";
    }
  } catch (err) {
    console.error("Save error", err);
    showToast("Error de conexión al guardar.", true);
    btn.innerText = "Guardar Pronósticos";
    btn.disabled = false;
  }
}

// Log out
async function handleLogout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/index.html';
}

// Toast helper
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

// Mobile round toggle handler
function selectMobileRound(colClass, btn) {
  currentMobileRound = colClass;
  
  // Update button active states
  document.querySelectorAll('.round-select-btn').forEach(b => b.classList.remove('active'));
  
  if (btn) {
    btn.classList.add('active');
  } else {
    const activeBtn = document.getElementById(`btn-${colClass}`);
    if (activeBtn) activeBtn.classList.add('active');
  }
  
  // Show target round column, hide others
  document.querySelectorAll('.bracket-round-col').forEach(col => {
    col.classList.remove('active');
    if (col.classList.contains(colClass)) {
      col.classList.add('active');
    }
    // If showing Final, also show the Champion column (trophy-col)
    if (colClass === 'final-col' && col.classList.contains('trophy-col')) {
      col.classList.add('active');
    }
  });
}

// Helper to calculate the winner of a match based on scores and penalties
function getWinnerOfMatch(local, visitor, gl, gv, pkl, pkv) {
  if (gl === undefined || gl === null || gl === '' || gv === undefined || gv === null || gv === '') {
    return null;
  }
  const goalsL = parseInt(gl);
  const goalsV = parseInt(gv);
  if (goalsL > goalsV) return local;
  if (goalsL < goalsV) return visitor;
  
  // Tie: check penalties
  if (pkl === undefined || pkl === null || pkl === '' || pkv === undefined || pkv === null || pkv === '') {
    return null;
  }
  const pkL = parseInt(pkl);
  const pkV = parseInt(pkv);
  if (pkL > pkV) return local;
  if (pkL < pkV) return visitor;
  return null;
}

// Helper to determine the loser of a match
function getLoserOfMatch(local, visitor, winner) {
  if (!winner) return null;
  if (winner === local) return visitor;
  if (winner === visitor) return local;
  return null;
}

// Toggle visibility of the Thirds ranking table body
function toggleThirdsTable() {
  const collapsible = document.getElementById('thirds-table-collapsible');
  const icon = document.getElementById('thirds-toggle-icon');
  if (!collapsible || !icon) return;
  
  if (collapsible.style.display === 'none') {
    collapsible.style.display = 'block';
    icon.innerHTML = '▼ Ocultar';
    icon.style.background = 'rgba(245, 158, 11, 0.3)';
  } else {
    collapsible.style.display = 'none';
    icon.innerHTML = '▶ Mostrar';
    icon.style.background = 'rgba(245, 158, 11, 0.15)';
  }
}

// Explicit chronological order map based on the real FIFA 2026 calendar.
const MATCH_CHRONO_ORDER = {
  // === JORNADA 1 ===
  "M001": 1, "M002": 2, "M007": 3, "M019": 4, "M008": 5,
  "M013": 6, "M014": 7, "M020": 8, "M025": 9, "M031": 10,
  "M026": 11, "M032": 12, "M043": 13, "M037": 14, "M044": 15,
  "M038": 16, "M049": 17, "M050": 18, "M055": 19, "M056": 20,
  "M061": 21, "M067": 22, "M068": 23, "M062": 24,
  // === JORNADA 2 ===
  "M004": 25, "M010": 26, "M009": 27, "M003": 28, "M021": 29,
  "M016": 30, "M015": 31, "M022": 32, "M033": 33, "M027": 34,
  "M028": 35, "M034": 36, "M045": 37, "M039": 38, "M046": 39,
  "M040": 40, "M053": 41, "M054": 42, "M058": 43, "M057": 44,
  "M063": 45, "M064": 46, "M069": 47, "M070": 48,
  // === JORNADA 3 ===
  "M012": 49, "M017": 50, "M018": 51, "M005": 52, "M006": 53,
  "M029": 54, "M030": 55, "M035": 56, "M036": 57, "M011": 58,
  "M023": 59, "M024": 60, "M042": 61, "M041": 62, "M048": 63,
  "M047": 64, "M052": 65, "M051": 66, "M060": 67, "M059": 68,
  "M066": 69, "M065": 70, "M072": 71, "M071": 72,
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
    const numA = parseInt(mA.id.replace('M', ''));
    const numB = parseInt(mB.id.replace('M', ''));
    return numA - numB;
  }
}

// Render the chronological timeline matches
function renderTimeline() {
  const container = document.getElementById('timeline-matches-container');
  if (!container) return;
  
  const sortedMatches = [...allMatches].sort(compareMatchesChronologically);
  const userBracket = calculateUserBracket(draftPredictions, allMatches);

  let lastSection = null;
  let html = '';

  sortedMatches.forEach((m, idx) => {
    const pred = draftPredictions.matches[m.id] || { gl: '', gv: '', pkl: '', pkv: '' };
    const hasRealResult = m.gl !== null && m.gv !== null && m.gl !== '' && m.gv !== '';
    const realScoreStr = hasRealResult
      ? `${m.gl} - ${m.gv}${m.pkl !== null && m.pkl !== '' && m.pkl !== undefined ? ` (PK ${m.pkl}-${m.pkv})` : ''}`
      : '–';

    const isKnockout = m.phase !== 'Group Stage';
    const phaseLabel = isKnockout ? m.phase : `Grupo ${m.group}`;

    let sectionLabel = null;
    if (!isKnockout) {
      const order = MATCH_CHRONO_ORDER[m.id] || 999;
      const jornada = order <= 24 ? 'Fase de Grupos · Jornada 1' :
                      order <= 48 ? 'Fase de Grupos · Jornada 2' :
                                    'Fase de Grupos · Jornada 3';
      if (jornada !== lastSection) { sectionLabel = jornada; lastSection = jornada; }
    } else {
      if (m.phase !== lastSection) { sectionLabel = m.phase; lastSection = m.phase; }
    }

    if (sectionLabel) {
      html += `
        <div style="display: flex; align-items: center; gap: 10px; margin: ${idx === 0 ? '0' : '6px'} 0 4px;">
          <span style="font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: var(--primary); white-space: nowrap;">${sectionLabel}</span>
          <div style="flex: 1; height: 1px; background: rgba(255,255,255,0.06);"></div>
        </div>`;
    }

    if (!isKnockout) {
      // Group Stage standard rendering
      const hasPrediction = pred.gl !== '' && pred.gv !== '' && pred.gl !== undefined && pred.gv !== undefined;
      const predScoreStr = hasPrediction
        ? `${pred.gl} - ${pred.gv}${pred.pkl !== null && pred.pkl !== '' && pred.pkl !== undefined ? ` (PK ${pred.pkl}-${pred.pkv})` : ''}`
        : 'Sin pronóstico';

      let pointsBadge = '';
      if (hasRealResult && hasPrediction) {
        let points = 0;
        const rGl = parseInt(m.gl), rGv = parseInt(m.gv);
        const pGl = parseInt(pred.gl), pGv = parseInt(pred.gv);
        const exact = (rGl === pGl) && (rGv === pGv);
        const outcome = Math.sign(rGl - rGv) === Math.sign(pGl - pGv);
        if (exact) points = 3; else if (outcome) points = 1;
        const cls = points === 3 ? 'exact' : (points === 1 ? 'outcome' : 'zero');
        pointsBadge = `<span class="matrix-points-badge points-${cls}">+${points}</span>`;
      }

      html += `
        <div class="tl-card ${hasRealResult ? 'played' : 'pending'}" data-match-id="${m.id}">
          <div class="tl-info">
            <div class="tl-meta">${m.id} &middot; ${phaseLabel}${m.date ? ` &middot; ${m.date} | ${m.time}` : ''}</div>
            <div class="tl-teams">
              <img src="https://flagcdn.com/w40/${(getFlagCode(m.local) || 'xx')}.png" style="width:18px;height:12px;object-fit:cover;border-radius:2px;flex-shrink:0;" alt="${m.local}" onerror="this.style.display='none'">
              <span class="tl-team-name">${m.local}</span>
              <span class="tl-vs">vs</span>
              <img src="https://flagcdn.com/w40/${(getFlagCode(m.visitor) || 'xx')}.png" style="width:18px;height:12px;object-fit:cover;border-radius:2px;flex-shrink:0;" alt="${m.visitor}" onerror="this.style.display='none'">
              <span class="tl-team-name">${m.visitor}</span>
            </div>
          </div>
          <div class="tl-scores-row">
            <div class="tl-result">
              <div class="tl-section-label">Resultado</div>
              <div class="tl-score-real ${hasRealResult ? 'has-result' : 'pending'}">${realScoreStr}</div>
            </div>
            <div class="tl-prediction">
              <div class="tl-section-label">Tu pronóstico</div>
              <div class="tl-score-pred ${hasPrediction ? 'has-pred' : 'no-pred'}">
                <span>${predScoreStr}</span>${pointsBadge}
              </div>
            </div>
          </div>
        </div>`;
    } else {
      // Knockout Stage intuitive rendering ("forma chula")
      const locAugury = getKnockoutTeamAugurySummary(m.local, userBracket, draftPredictions);
      const visAugury = getKnockoutTeamAugurySummary(m.visitor, userBracket, draftPredictions);

      let ptsBadge = '';
      if (hasRealResult) {
        let pts = 0;
        const rW = getWinnerOfMatch(m.local, m.visitor, m.gl, m.gv, m.pkl, m.pkv);
        if (rW) {
          const realWinnerIsLocal = (rW === m.local);
          const realGl = parseInt(m.gl);
          const realGv = parseInt(m.gv);
          const realWinnerGFor = realWinnerIsLocal ? realGl : realGv;
          const realWinnerGAgainst = realWinnerIsLocal ? realGv : realGl;
          
          const realPkl = (m.pkl !== null && m.pkl !== undefined && m.pkl !== '') ? parseInt(m.pkl) : null;
          const realPkv = (m.pkv !== null && m.pkv !== undefined && m.pkv !== '') ? parseInt(m.pkv) : null;
          const realWinnerPkFor = (realPkl !== null && realPkv !== null) ? (realWinnerIsLocal ? realPkl : realPkv) : null;
          const realWinnerPkAgainst = (realPkl !== null && realPkv !== null) ? (realWinnerIsLocal ? realPkv : realPkl) : null;
          
          let hasAdv = false;
          let isExact = false;
          
          for (const pMatchId in userBracket) {
            const matchObj = allMatches.find(x => x.id === pMatchId);
            if (matchObj && matchObj.phase === m.phase) {
              const uM = userBracket[pMatchId];
              if (uM && (uM.local === rW || uM.visitor === rW)) {
                if (uM.winner === rW) {
                  hasAdv = true;
                  const pPred = draftPredictions.matches[pMatchId];
                  if (pPred && pPred.gl !== '' && pPred.gl !== undefined && pPred.gl !== null && pPred.gv !== '' && pPred.gv !== undefined && pPred.gv !== null) {
                    const predGl = parseInt(pPred.gl);
                    const predGv = parseInt(pPred.gv);
                    const usrWinnerIsLocal = (uM.local === rW);
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
          if (isExact) pts = 3;
          else if (hasAdv) pts = 1;
        }
        const cls = pts === 3 ? 'exact' : (pts === 1 ? 'outcome' : 'zero');
        ptsBadge = `<span class="matrix-points-badge points-${cls}" style="font-size: 0.8rem; padding: 3px 10px; border-radius: 8px;">+${pts} ${pts === 1 ? 'Pt' : 'Pts'}</span>`;
      }

      const locTextHtml = locAugury ? locAugury.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') : '⚪ No avanzó a esta ronda';
      const visTextHtml = visAugury ? visAugury.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') : '⚪ No avanzó a esta ronda';

      html += `
        <div class="tl-card tl-card-knockout ${hasRealResult ? 'played' : 'pending'}" data-match-id="${m.id}">
          <div class="tl-info tl-knockout-info">
            <div class="tl-meta">${m.id} &middot; ${phaseLabel}${m.date ? ` &middot; ${m.date} | ${m.time}` : ''}</div>
            <div class="tl-teams" style="margin-top: 6px;">
              <img src="https://flagcdn.com/w40/${(getFlagCode(m.local) || 'xx')}.png" style="width:20px;height:14px;object-fit:cover;border-radius:2px;flex-shrink:0;" alt="${m.local}" onerror="this.style.display='none'">
              <span class="tl-team-name" style="font-size: 0.95rem;">${m.local}</span>
              <span class="tl-vs">vs</span>
              <img src="https://flagcdn.com/w40/${(getFlagCode(m.visitor) || 'xx')}.png" style="width:20px;height:14px;object-fit:cover;border-radius:2px;flex-shrink:0;" alt="${m.visitor}" onerror="this.style.display='none'">
              <span class="tl-team-name" style="font-size: 0.95rem;">${m.visitor}</span>
            </div>
          </div>

          <div class="tl-result tl-knockout-result">
            <div class="tl-section-label">Resultado Real</div>
            <div class="tl-score-real ${hasRealResult ? 'has-result' : 'pending'}">${realScoreStr}</div>
          </div>

          <div class="tl-knockout-box">
            <div class="tl-knockout-header">
              <span>⚽ Tu pronóstico para este cruce</span>
              ${ptsBadge}
            </div>
            <div class="tl-knockout-row">
              <span style="display: inline-flex; align-items: center; gap: 6px;">${getFlagImgHtml(m.local)} <strong>${m.local}</strong></span>
              <span>${locTextHtml}</span>
            </div>
            <div class="tl-knockout-row">
              <span style="display: inline-flex; align-items: center; gap: 6px;">${getFlagImgHtml(m.visitor)} <strong>${m.visitor}</strong></span>
              <span>${visTextHtml}</span>
            </div>
          </div>
        </div>`;
    }
  });

  container.innerHTML = html;
}


// Helper: map team name → flagcdn 2-letter country code
// Used by renderTimeline for the <img> flag tags in each match card
function getFlagCode(teamName) {
  const FLAG_CODES = {
    "Mexico": "mx", "Sudafrica": "za", "Corea del Sur": "kr", "Rep. Checa": "cz",
    "Canada": "ca", "Bosnia y Herzegovina": "ba", "Catar": "qa", "Suiza": "ch",
    "Brasil": "br", "Marruecos": "ma", "Haiti": "ht", "Escocia": "gb-sct",
    "Estados Unidos": "us", "Paraguay": "py", "Australia": "au", "Turquia": "tr",
    "Alemania": "de", "Curazao": "cw", "Costa de Marfil": "ci", "Ecuador": "ec",
    "Paises Bajos": "nl", "Japon": "jp", "Suecia": "se", "Tunez": "tn",
    "Belgica": "be", "Egipto": "eg", "Iran": "ir", "Nueva Zelanda": "nz",
    "Espana": "es", "Cabo Verde": "cv", "Arabia Saudi": "sa", "Uruguay": "uy",
    "Francia": "fr", "Senegal": "sn", "Noruega": "no", "Irak": "iq",
    "Argentina": "ar", "Argelia": "dz", "Austria": "at", "Jordania": "jo",
    "Portugal": "pt", "RD Congo": "cd", "Uzbekistan": "uz", "Colombia": "co",
    "Inglaterra": "gb-eng", "Croacia": "hr", "Ghana": "gh", "Panama": "pa"
  };
  return FLAG_CODES[teamName] || null;
}

// Filter timeline list function
function filterTimelineList() {
  const query = document.getElementById('search-timeline').value.toLowerCase().trim();
  const status = document.getElementById('filter-timeline-status').value;
  const cards = document.querySelectorAll('.tl-card');
  
  cards.forEach(card => {
    const text = card.innerText.toLowerCase();
    const isPlayed = card.classList.contains('played');
    
    const matchesQuery = !query || text.includes(query);
    const matchesStatus = (status === 'all') ||
                          (status === 'played' && isPlayed) ||
                          (status === 'pending' && !isPlayed);
                          
    card.style.display = (matchesQuery && matchesStatus) ? '' : 'none';
  });
}

// Auto-scroll timeline to third-to-last played match
function scrollToThirdToLastPlayedMatch() {
  const sortedMatches = [...allMatches].sort(compareMatchesChronologically);
  const playedMatches = sortedMatches.filter(m => m.gl !== null && m.gv !== null);
  if (playedMatches.length > 0) {
    const targetIndex = Math.max(0, playedMatches.length - 3);
    const targetMatch = playedMatches[targetIndex];
    setTimeout(() => {
      const card = document.querySelector(`.tl-card[data-match-id="${targetMatch.id}"]`);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  }
}

// Bind timeline filter to window
window.filterTimelineList = filterTimelineList;

function calculateUserBracket(predObj, dbMatches) {
  const standings = {};
  const groups = ['A','B','C','D','E','F','G','H','I','J','K','L'];
  groups.forEach(g => {
    standings[g] = [];
    const groupMatches = dbMatches.filter(m => m.phase === 'Group Stage' && m.group === g);
    const teams = new Set();
    groupMatches.forEach(m => { teams.add(m.local); teams.add(m.visitor); });
    teams.forEach(t => { standings[g].push({ team: t, pts: 0, gf: 0, gc: 0, dg: 0, fifaRank: TEAM_DATA[t]?.rank || 150 }); });
  });
  dbMatches.forEach(m => {
    if (m.phase !== 'Group Stage') return;
    const g = m.group;
    const pred = predObj.matches[m.id];
    if (pred && pred.gl !== '' && pred.gl !== undefined && pred.gl !== null && pred.gv !== '' && pred.gv !== undefined && pred.gv !== null) {
      const gl = parseInt(pred.gl); const gv = parseInt(pred.gv);
      const localTeam = standings[g].find(x => x.team === m.local);
      const visitorTeam = standings[g].find(x => x.team === m.visitor);
      if (localTeam && visitorTeam) {
        localTeam.gf += gl; localTeam.gc += gv; localTeam.dg += (gl - gv);
        visitorTeam.gf += gv; visitorTeam.gc += gl; visitorTeam.dg += (gv - gl);
        if (gl > gv) localTeam.pts += 3; else if (gv > gl) visitorTeam.pts += 3; else { localTeam.pts += 1; visitorTeam.pts += 1; }
      }
    }
  });
  groups.forEach(g => { standings[g].sort((a, b) => { if (b.pts !== a.pts) return b.pts - a.pts; if (b.dg !== a.dg) return b.dg - a.dg; if (b.gf !== a.gf) return b.gf - a.gf; return a.fifaRank - b.fifaRank; }); });
  const thirds = [];
  for (const g in standings) {
    const t3 = standings[g][2];
    if (t3) {
      const groupMatches = dbMatches.filter(m => m.phase === 'Group Stage' && m.group === g);
      const isCompleted = groupMatches.every(m => { const p = predObj.matches[m.id]; return p && p.gl !== '' && p.gl !== undefined && p.gl !== null && p.gv !== '' && p.gv !== undefined && p.gv !== null; });
      thirds.push({ group: g, team: isCompleted ? t3.team : `3º Grupo ${g}`, pts: isCompleted ? t3.pts : 0, gf: isCompleted ? t3.gf : 0, gc: isCompleted ? t3.gc : 0, dg: isCompleted ? t3.dg : 0, fifaRank: t3.fifaRank });
    }
  }
  thirds.sort((a, b) => { if (b.pts !== a.pts) return b.pts - a.pts; if (b.dg !== a.dg) return b.dg - a.dg; if (b.gf !== a.gf) return b.gf - a.gf; return a.fifaRank - b.fifaRank; });
  const top8Thirds = thirds.slice(0, 8);
  const advanceTeams = {
    "3o Top 1": top8Thirds[0]?.team || "3º Mejor 1", "3o Top 2": top8Thirds[1]?.team || "3º Mejor 2", "3o Top 3": top8Thirds[2]?.team || "3º Mejor 3", "3o Top 4": top8Thirds[3]?.team || "3º Mejor 4",
    "3o Top 5": top8Thirds[4]?.team || "3º Mejor 5", "3o Top 6": top8Thirds[5]?.team || "3º Mejor 6", "3o Top 7": top8Thirds[6]?.team || "3º Mejor 7", "3o Top 8": top8Thirds[7]?.team || "3º Mejor 8"
  };
  groups.forEach(g => {
    const groupMatches = dbMatches.filter(m => m.phase === 'Group Stage' && m.group === g);
    const isCompleted = groupMatches.every(m => { const p = predObj.matches[m.id]; return p && p.gl !== '' && p.gl !== undefined && p.gl !== null && p.gv !== '' && p.gv !== undefined && p.gv !== null; });
    advanceTeams[`1${g}`] = isCompleted ? (standings[g][0]?.team || `1º Grupo ${g}`) : `1º Grupo ${g}`;
    advanceTeams[`2${g}`] = isCompleted ? (standings[g][1]?.team || `2º Grupo ${g}`) : `2º Grupo ${g}`;
    advanceTeams[`3${g}`] = isCompleted ? (standings[g][2]?.team || `3º Grupo ${g}`) : `3º Grupo ${g}`;
  });
  const bracketTeams = {}; const userMatches = {};
  const r32Matches = [
    { id: "M73", label: "D1", lRef: "1A", vRef: "3o Top 1" }, { id: "M74", label: "D2", lRef: "2A", vRef: "2B" }, { id: "M75", label: "D3", lRef: "1B", vRef: "3o Top 2" }, { id: "M76", label: "D4", lRef: "1C", vRef: "3o Top 3" },
    { id: "M77", label: "D5", lRef: "2C", vRef: "2D" }, { id: "M78", label: "D6", lRef: "1D", vRef: "3o Top 4" }, { id: "M79", label: "D7", lRef: "1E", vRef: "3o Top 5" }, { id: "M80", label: "D8", lRef: "2E", vRef: "2F" },
    { id: "M81", label: "D9", lRef: "1F", vRef: "3o Top 6" }, { id: "M82", label: "D10", lRef: "1G", vRef: "3o Top 7" }, { id: "M83", label: "D11", lRef: "2G", vRef: "2H" }, { id: "M84", label: "D12", lRef: "1H", vRef: "3o Top 8" },
    { id: "M85", label: "D13", lRef: "1I", vRef: "2J" }, { id: "M86", label: "D14", lRef: "1J", vRef: "2K" }, { id: "M87", label: "D15", lRef: "1K", vRef: "2L" }, { id: "M88", label: "D16", lRef: "1L", vRef: "2I" }
  ];
  r32Matches.forEach(m => {
    const local = advanceTeams[m.lRef]; const visitor = advanceTeams[m.vRef];
    const pred = predObj.matches[m.id] || { gl: '', gv: '', pkl: '', pkv: '' };
    const winner = getWinnerOfMatch(local, visitor, pred.gl, pred.gv, pred.pkl, pred.pkv);
    const loser = (winner === local) ? visitor : ((winner === visitor) ? local : null);
    bracketTeams[m.label] = winner; userMatches[m.id] = { local, visitor, winner, loser };
  });
  const r16Matches = [
    { id: "M89", label: "O1", lRef: "D1", vRef: "D2" }, { id: "M90", label: "O2", lRef: "D3", vRef: "D4" }, { id: "M91", label: "O3", lRef: "D5", vRef: "D6" }, { id: "M92", label: "O4", lRef: "D7", vRef: "D8" },
    { id: "M93", label: "O5", lRef: "D9", vRef: "D10" }, { id: "M94", label: "O6", lRef: "D11", vRef: "D12" }, { id: "M95", label: "O7", lRef: "D13", vRef: "D14" }, { id: "M96", label: "O8", lRef: "D15", vRef: "D16" }
  ];
  r16Matches.forEach(m => {
    const local = bracketTeams[m.lRef] || `Ganador ${m.lRef}`; const visitor = bracketTeams[m.vRef] || `Ganador ${m.vRef}`;
    const pred = predObj.matches[m.id] || { gl: '', gv: '', pkl: '', pkv: '' };
    const winner = getWinnerOfMatch(local, visitor, pred.gl, pred.gv, pred.pkl, pred.pkv);
    const loser = (winner === local) ? visitor : ((winner === visitor) ? local : null);
    bracketTeams[m.label] = winner; userMatches[m.id] = { local, visitor, winner, loser };
  });
  const r8Matches = [ { id: "M97", label: "C1", lRef: "O1", vRef: "O2" }, { id: "M98", label: "C2", lRef: "O3", vRef: "O4" }, { id: "M99", label: "C3", lRef: "O5", vRef: "O6" }, { id: "M100", label: "C4", lRef: "O7", vRef: "O8" } ];
  r8Matches.forEach(m => {
    const local = bracketTeams[m.lRef] || `Ganador ${m.lRef}`; const visitor = bracketTeams[m.vRef] || `Ganador ${m.vRef}`;
    const pred = predObj.matches[m.id] || { gl: '', gv: '', pkl: '', pkv: '' };
    const winner = getWinnerOfMatch(local, visitor, pred.gl, pred.gv, pred.pkl, pred.pkv);
    const loser = (winner === local) ? visitor : ((winner === visitor) ? local : null);
    bracketTeams[m.label] = winner; userMatches[m.id] = { local, visitor, winner, loser };
  });
  const s1Local = bracketTeams["C1"] || "Ganador C1"; const s1Visitor = bracketTeams["C2"] || "Ganador C2";
  const s2Local = bracketTeams["C3"] || "Ganador C3"; const s2Visitor = bracketTeams["C4"] || "Ganador C4";
  const s1Pred = predObj.matches["M101"] || { gl: '', gv: '', pkl: '', pkv: '' }; const s2Pred = predObj.matches["M102"] || { gl: '', gv: '', pkl: '', pkv: '' };
  const s1Winner = getWinnerOfMatch(s1Local, s1Visitor, s1Pred.gl, s1Pred.gv, s1Pred.pkl, s1Pred.pkv); const s2Winner = getWinnerOfMatch(s2Local, s2Visitor, s2Pred.gl, s2Pred.gv, s2Pred.pkl, s2Pred.pkv);
  const s1Loser = s1Winner ? ((s1Winner === s1Local) ? s1Visitor : s1Local) : null; const s2Loser = s2Winner ? ((s2Winner === s2Local) ? s2Visitor : s2Local) : null;
  userMatches["M101"] = { local: s1Local, visitor: s1Visitor, winner: s1Winner, loser: s1Loser }; userMatches["M102"] = { local: s2Local, visitor: s2Visitor, winner: s2Winner, loser: s2Loser };
  const t3Local = s1Loser || "Perdedor S1"; const t3Visitor = s2Loser || "Perdedor S2"; const t3Pred = predObj.matches["M103"] || { gl: '', gv: '', pkl: '', pkv: '' };
  const t3Winner = getWinnerOfMatch(t3Local, t3Visitor, t3Pred.gl, t3Pred.gv, t3Pred.pkl, t3Pred.pkv); const t3Loser = t3Winner ? ((t3Winner === t3Local) ? t3Visitor : t3Local) : null;
  userMatches["M103"] = { local: t3Local, visitor: t3Visitor, winner: t3Winner, loser: t3Loser };
  const finalLocal = s1Winner || "Ganador S1"; const finalVisitor = s2Winner || "Ganador S2"; const finalPred = predObj.matches["M104"] || { gl: '', gv: '', pkl: '', pkv: '' };
  const finalWinner = getWinnerOfMatch(finalLocal, finalVisitor, finalPred.gl, finalPred.gv, finalPred.pkl, finalPred.pkv); const finalLoser = finalWinner ? ((finalWinner === finalLocal) ? finalVisitor : finalLocal) : null;
  userMatches["M104"] = { local: finalLocal, visitor: finalVisitor, winner: finalWinner, loser: finalLoser };
  return userMatches;
}

function getKnockoutTeamAugurySummary(teamName, userBracket, predObj) {
  if (!teamName || teamName.startsWith('Ganador') || teamName.startsWith('Perdedor') || teamName.startsWith('Local') || teamName.startsWith('Visitante') || teamName.startsWith('1º') || teamName.startsWith('2º') || teamName.startsWith('3º')) {
    return null;
  }
  for (const mId in userBracket) {
    const um = userBracket[mId];
    if (um.local === teamName || um.visitor === teamName) {
      const pred = predObj.matches[mId];
      if (!pred || pred.gl === '' || pred.gl === undefined || pred.gl === null || pred.gv === '' || pred.gv === undefined || pred.gv === null) {
        return { text: 'Sin marcador asignado', won: false };
      }
      const isLocal = um.local === teamName;
      const gFor = isLocal ? parseInt(pred.gl) : parseInt(pred.gv);
      const gAgainst = isLocal ? parseInt(pred.gv) : parseInt(pred.gl);
      const won = um.winner === teamName;
      const opp = isLocal ? um.visitor : um.local;
      let pklStr = '';
      if (pred.pkl !== '' && pred.pkl !== undefined && pred.pkl !== null && pred.pkv !== '' && pred.pkv !== undefined && pred.pkv !== null) {
        const pkFor = isLocal ? pred.pkl : pred.pkv;
        const pkAgainst = isLocal ? pred.pkv : pred.pkl;
        pklStr = ` (PK ${pkFor}-${pkAgainst})`;
      }
      const outcomeText = won ? 'ganaba' : 'perdía';
      const icon = won ? '🟢' : '🔴';
      return {
        text: `${icon} Pusiste que **${outcomeText} ${gFor}-${gAgainst}** (vs ${opp})${pklStr}`,
        won,
        gFor,
        gAgainst,
        opponent: opp
      };
    }
  }
  return { text: '⚪ No avanzó a esta ronda en tu porra', won: false };
}
