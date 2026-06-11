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
let currentTab = 'groups';

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
    if (currentUser.isAdmin) {
      document.getElementById('admin-nav-link').style.display = 'inline-block';
    }
  }
}

// Load deadline countdown
async function loadDeadline() {
  const res = await fetch('/api/predictions/deadline');
  const data = await res.json();
  
  // Administrators can always edit their predictions
  isLocked = data.isPassed && !currentUser.isAdmin;
  
  if (data.isPassed) {
    if (currentUser.isAdmin) {
      document.getElementById('readonly-message-banner').innerHTML = `
        <div style="background: rgba(46, 204, 113, 0.15); border: 1px solid var(--primary); padding: 12px; border-radius: 8px; text-align: center; color: #fff; font-weight: 600; font-size: 0.9rem;">
          ⚽ Modo Administrador: La fecha límite ha pasado, pero tienes permiso para modificar tus pronósticos.
        </div>
      `;
      document.getElementById('readonly-message-banner').style.display = 'block';
      document.getElementById('save-bar').style.display = 'flex';
    } else {
      document.getElementById('readonly-message-banner').style.display = 'block';
      document.getElementById('save-bar').style.display = 'none';
    }
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
  document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
  
  if (tabName === 'groups') {
    document.querySelector('.phase-tab:nth-child(1)').classList.add('active');
    document.getElementById('tab-groups').style.display = 'block';
  } else if (tabName === 'knockouts') {
    document.querySelector('.phase-tab:nth-child(2)').classList.add('active');
    document.getElementById('tab-knockouts').style.display = 'block';
  } else if (tabName === 'awards') {
    document.querySelector('.phase-tab:nth-child(3)').classList.add('active');
    document.getElementById('tab-awards').style.display = 'block';
  }
}

// Load matches data and participant predictions
async function loadMatchesAndPredictions() {
  try {
    const matchRes = await fetch('/api/matches');
    allMatches = await matchRes.json();
    
    const predRes = await fetch(`/api/predictions/${currentUser.id}`);
    userPredictions = await predRes.json();
    
    // Deep copy for draft
    draftPredictions = JSON.parse(JSON.stringify(userPredictions));
    if (!draftPredictions.matches) draftPredictions.matches = {};
    if (!draftPredictions.specials) draftPredictions.specials = {};
    
    renderGroups();
    renderAwards();
    recalculateAll();
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
      const disabledAttr = isLocked ? 'disabled' : '';
      
      matchesHtml += `
        <div class="match-card">
          <div class="match-header">
            <span>Partido ${m.id}</span>
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
function rankThirdPlaces(groupStandings) {
  const thirds = [];
  
  for (const g in groupStandings) {
    const t3 = groupStandings[g][2]; // 3rd position (index 2)
    if (t3) {
      thirds.push({
        group: g,
        team: t3.team,
        pts: t3.pts,
        gf: t3.gf,
        gc: t3.gc,
        dg: t3.dg,
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

// Bracket advancement logic
function advanceBracket(groupStandings, thirdsRanking) {
  const top8Thirds = thirdsRanking.slice(0, 8);
  
  // Map advancement teams (Round of 32 definitions)
  const advanceTeams = {
    "1A": groupStandings['A'][0]?.team || "1A",
    "2A": groupStandings['A'][1]?.team || "2A",
    "1B": groupStandings['B'][0]?.team || "1B",
    "2B": groupStandings['B'][1]?.team || "2B",
    "1C": groupStandings['C'][0]?.team || "1C",
    "2C": groupStandings['C'][1]?.team || "2C",
    "1D": groupStandings['D'][0]?.team || "1D",
    "2D": groupStandings['D'][1]?.team || "2D",
    "1E": groupStandings['E'][0]?.team || "1E",
    "2E": groupStandings['E'][1]?.team || "2E",
    "1F": groupStandings['F'][0]?.team || "1F",
    "2F": groupStandings['F'][1]?.team || "2F",
    "1G": groupStandings['G'][0]?.team || "1G",
    "2G": groupStandings['G'][1]?.team || "2G",
    "1H": groupStandings['H'][0]?.team || "1H",
    "2H": groupStandings['H'][1]?.team || "2H",
    "1I": groupStandings['I'][0]?.team || "1I",
    "2I": groupStandings['I'][1]?.team || "2I",
    "1J": groupStandings['J'][0]?.team || "1J",
    "2J": groupStandings['J'][1]?.team || "2J",
    "1K": groupStandings['K'][0]?.team || "1K",
    "2K": groupStandings['K'][1]?.team || "2K",
    "1L": groupStandings['L'][0]?.team || "1L",
    "2L": groupStandings['L'][1]?.team || "2L",
    
    // Top 8 thirds
    "3o Top 1": top8Thirds[0]?.team || "3º Top 1",
    "3o Top 2": top8Thirds[1]?.team || "3º Top 2",
    "3o Top 3": top8Thirds[2]?.team || "3º Top 3",
    "3o Top 4": top8Thirds[3]?.team || "3º Top 4",
    "3o Top 5": top8Thirds[4]?.team || "3º Top 5",
    "3o Top 6": top8Thirds[5]?.team || "3º Top 6",
    "3o Top 7": top8Thirds[6]?.team || "3º Top 7",
    "3o Top 8": top8Thirds[7]?.team || "3º Top 8"
  };
  
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
  
  // 1. Render Round of 32
  let r32Html = '';
  r32Matches.forEach(m => {
    const localTeam = advanceTeams[m.lRef];
    const visitorTeam = advanceTeams[m.vRef];
    
    const pred = draftPredictions.matches[m.id] || { gl: '', gv: '', pkl: '', pkv: '' };
    const winner = getWinnerOfMatch(localTeam, visitorTeam, pred.gl, pred.gv, pred.pkl, pred.pkv);
    
    bracketTeams[m.label] = winner;
    
    r32Html += renderMatchCardHtml(m.id, m.label, localTeam, visitorTeam, pred, "dieciseisavos");
  });
  document.getElementById('round-r32-container').innerHTML = r32Html;
  
  // 2. Render Round of 16 (Octavos, M89 to M96)
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
  
  let r16Html = '';
  r16Matches.forEach(m => {
    const localTeam = bracketTeams[m.lRef] || `Ganador ${m.lRef}`;
    const visitorTeam = bracketTeams[m.vRef] || `Ganador ${m.vRef}`;
    
    const pred = draftPredictions.matches[m.id] || { gl: '', gv: '', pkl: '', pkv: '' };
    const winner = getWinnerOfMatch(localTeam, visitorTeam, pred.gl, pred.gv, pred.pkl, pred.pkv);
    
    bracketTeams[m.label] = winner;
    r16Html += renderMatchCardHtml(m.id, m.label, localTeam, visitorTeam, pred, "octavos");
  });
  document.getElementById('round-r16-container').innerHTML = r16Html;

  // 3. Render Quarterfinals (Cuartos, M97 to M100)
  const r8Matches = [
    { id: "M97", label: "C1", lRef: "O1", vRef: "O2" },
    { id: "M98", label: "C2", lRef: "O3", vRef: "O4" },
    { id: "M99", label: "C3", lRef: "O5", vRef: "O6" },
    { id: "M100", label: "C4", lRef: "O7", vRef: "O8" }
  ];
  
  let r8Html = '';
  r8Matches.forEach(m => {
    const localTeam = bracketTeams[m.lRef] || `Ganador ${m.lRef}`;
    const visitorTeam = bracketTeams[m.vRef] || `Ganador ${m.vRef}`;
    
    const pred = draftPredictions.matches[m.id] || { gl: '', gv: '', pkl: '', pkv: '' };
    const winner = getWinnerOfMatch(localTeam, visitorTeam, pred.gl, pred.gv, pred.pkl, pred.pkv);
    
    bracketTeams[m.label] = winner;
    r8Html += renderMatchCardHtml(m.id, m.label, localTeam, visitorTeam, pred, "cuartos");
  });
  document.getElementById('round-r8-container').innerHTML = r8Html;

  // 4. Render Semifinals & Third Place (M101 to M103)
  const s1Pred = draftPredictions.matches["M101"] || { gl: '', gv: '', pkl: '', pkv: '' };
  const s2Pred = draftPredictions.matches["M102"] || { gl: '', gv: '', pkl: '', pkv: '' };
  
  const s1Local = bracketTeams["C1"] || "Ganador C1";
  const s1Visitor = bracketTeams["C2"] || "Ganador C2";
  const s2Local = bracketTeams["C3"] || "Ganador C3";
  const s2Visitor = bracketTeams["C4"] || "Ganador C4";
  
  const s1Winner = getWinnerOfMatch(s1Local, s1Visitor, s1Pred.gl, s1Pred.gv, s1Pred.pkl, s1Pred.pkv);
  const s2Winner = getWinnerOfMatch(s2Local, s2Visitor, s2Pred.gl, s2Pred.gv, s2Pred.pkl, s2Pred.pkv);
  
  const s1Loser = getLoserOfMatch(s1Local, s1Visitor, s1Winner);
  const s2Loser = getLoserOfMatch(s2Local, s2Visitor, s2Winner);
  
  // Render Semis
  let r4Html = renderMatchCardHtml("M101", "S1", s1Local, s1Visitor, s1Pred, "semis");
  r4Html += renderMatchCardHtml("M102", "S2", s2Local, s2Visitor, s2Pred, "semis");
  
  // Render Third Place (M103)
  const t3Pred = draftPredictions.matches["M103"] || { gl: '', gv: '', pkl: '', pkv: '' };
  r4Html += renderMatchCardHtml("M103", "3º Puesto", s1Loser, s2Loser, t3Pred, "semis");
  document.getElementById('round-r4-container').innerHTML = r4Html;

  // 5. Render Final (M104)
  const finalPred = draftPredictions.matches["M104"] || { gl: '', gv: '', pkl: '', pkv: '' };
  let r2Html = renderMatchCardHtml("M104", "Final", s1Winner, s2Winner, finalPred, "final");
  document.getElementById('round-r2-container').innerHTML = r2Html;
}

// Helper: Calculate Match Winner (handles penalties)
function getWinnerOfMatch(local, visitor, gl, gv, pkl, pkv) {
  if (gl === '' || gl === undefined || gl === null || gv === '' || gv === undefined || gv === null) {
    return null;
  }
  const lGoals = parseInt(gl);
  const vGoals = parseInt(gv);
  
  if (lGoals > vGoals) return local;
  if (vGoals > lGoals) return visitor;
  
  // Tie: check penalties
  if (pkl === '' || pkl === undefined || pkl === null || pkv === '' || pkv === undefined || pkv === null) {
    return null;
  }
  const lPk = parseInt(pkl);
  const vPk = parseInt(pkv);
  
  if (lPk > vPk) return local;
  if (vPk > lPk) return visitor;
  
  return null;
}

// Helper: Calculate Match Loser
function getLoserOfMatch(local, visitor, winner) {
  if (!winner) return null;
  return winner === local ? visitor : local;
}

// Render Bracket Match Card HTML
function renderMatchCardHtml(matchId, label, local, visitor, pred, stepClass) {
  const flagL = getFlagImgHtml(local);
  const flagV = getFlagImgHtml(visitor);
  const disabledAttr = isLocked ? 'disabled' : '';
  
  // Display penalties if tie
  const isTie = (pred.gl !== '' && pred.gv !== '' && pred.gl !== undefined && pred.gv !== undefined && parseInt(pred.gl) === parseInt(pred.gv));
  const pkStyle = isTie ? 'flex' : 'none';
  
  return `
    <div class="match-card">
      <div class="match-header">
        <span>Partido ${matchId} (${label})</span>
        <span class="team-badge-circle">${TEAM_DATA[local]?.rank || '-'}</span>
      </div>
      <div class="match-body">
        <div class="team-wrapper">
          <span class="flag">${flagL}</span>
          <span class="team-name" title="${local}">${local}</span>
        </div>
        <div class="score-inputs">
          <input type="text" pattern="[0-9]*" class="score-input" value="${pred.gl ?? ''}" oninput="onScoreChange('${matchId}', 'gl', this.value)" ${disabledAttr}>
          <span class="score-divider">-</span>
          <input type="text" pattern="[0-9]*" class="score-input" value="${pred.gv ?? ''}" oninput="onScoreChange('${matchId}', 'gv', this.value)" ${disabledAttr}>
        </div>
        <div class="team-wrapper visitor">
          <span class="team-name" title="${visitor}">${visitor}</span>
          <span class="flag">${flagV}</span>
        </div>
      </div>
      
      <!-- Penalties dynamic row -->
      <div class="penalties-section" style="display: ${pkStyle};">
        <span class="penalties-label">Penaltis (PK):</span>
        <div class="penalties-inputs">
          <input type="text" pattern="[0-9]*" class="pk-input" value="${pred.pkl ?? ''}" oninput="onPKChange('${matchId}', 'pkl', this.value)" placeholder="P" ${disabledAttr}>
          <span>-</span>
          <input type="text" pattern="[0-9]*" class="pk-input" value="${pred.pkv ?? ''}" oninput="onPKChange('${matchId}', 'pkv', this.value)" placeholder="P" ${disabledAttr}>
        </div>
      </div>
    </div>
  `;
}

// Render Special Awards selections
function renderAwards() {
  const container = document.getElementById('specials-container');
  container.innerHTML = '';
  
  const awards = [
    { id: "balon_oro", label: "Balón de Oro (Mejor Jugador)" },
    { id: "balon_plata", label: "Balón de Plata" },
    { id: "balon_bronce", label: "Balón de Bronce" },
    { id: "bota_oro", label: "Bota de Oro (Máximo Goleador)" },
    { id: "bota_plata", label: "Bota de Plata" },
    { id: "bota_bronce", label: "Bota de Bronce" }
  ];
  
  // Find all teams list sorted alphabetically
  const teams = Object.keys(TEAM_DATA).sort();
  const disabledAttr = isLocked ? 'disabled' : '';
  
  awards.forEach(a => {
    const val = draftPredictions.specials[a.id] || "";
    
    let optionsHtml = '<option value="">-- Elige una selección --</option>';
    teams.forEach(t => {
      const selected = val === t ? 'selected' : '';
      optionsHtml += `<option value="${t}" ${selected}>[${TEAM_DATA[t].flag.toUpperCase()}] ${t}</option>`;
    });
    
    const flagPreviewHtml = val ? getFlagImgHtml(val) : '🏳️';
    
    const div = document.createElement('div');
    div.className = 'special-select-group';
    div.innerHTML = `
      <label class="form-label" for="award-select-${a.id}">${a.label}</label>
      <div style="display: flex; align-items: center; gap: 10px;">
        <span id="flag-preview-${a.id}" class="flag" style="font-size: 1.5rem; display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px;">${flagPreviewHtml}</span>
        <select id="award-select-${a.id}" class="form-control" onchange="onAwardChange('${a.id}', this.value)" ${disabledAttr}>
          ${optionsHtml}
        </select>
      </div>
    `;
    container.appendChild(div);
  });
}

function onAwardChange(awardId, val) {
  draftPredictions.specials[awardId] = val;
  const preview = document.getElementById(`flag-preview-${awardId}`);
  if (preview) {
    preview.innerHTML = val ? getFlagImgHtml(val) : '🏳️';
  }
  updateSaveBar();
}

// Floating save bar state management
function updateSaveBar() {
  if (isLocked) {
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
  if (isLocked) return;
  
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
