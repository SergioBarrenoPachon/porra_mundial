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

const TEAMS_LIST = Object.keys(TEAM_DATA).sort();

let currentUser = null;
let adminMatches = [];
let adminConfig = {};

document.addEventListener("DOMContentLoaded", async () => {
  await verifySession();
  await loadAdminDashboard();
});

async function verifySession() {
  const res = await fetch('/api/auth/me');
  const data = await res.json();
  if (!data.user || !data.user.isAdmin) {
    // Redirect non-admins or guests
    window.location.href = '/index.html';
  } else {
    currentUser = data.user;
    document.getElementById('user-greeting').innerText = `Admin: ${currentUser.username}`;
  }
}

// Load configurations and matches list
async function loadAdminDashboard() {
  try {
    const res = await fetch('/api/admin/dashboard');
    const data = await res.json();
    
    adminMatches = data.matches;
    adminConfig = data.config;
    
    populateConfigFields();
    renderMatchesList();
  } catch (err) {
    console.error(err);
    showToast("Error al cargar datos del panel de control.", true);
  }
}

// Populate config inputs
function populateConfigFields() {
  document.getElementById('pts-outcome').value = adminConfig.points.outcome;
  document.getElementById('pts-exact').value = adminConfig.points.exact;
  document.getElementById('pts-oro').value = adminConfig.points.balon_oro;
  document.getElementById('pts-plata').value = adminConfig.points.balon_plata;
  document.getElementById('pts-bronce').value = adminConfig.points.balon_bronce;
  
  // Set award winner selections if they exist
  document.getElementById('win-balon-oro').value = adminConfig.winners.balon_oro || "";
  document.getElementById('win-balon-plata').value = adminConfig.winners.balon_plata || "";
  document.getElementById('win-balon-bronce').value = adminConfig.winners.balon_bronce || "";
  document.getElementById('win-bota-oro').value = adminConfig.winners.bota_oro || "";
  document.getElementById('win-bota-plata').value = adminConfig.winners.bota_plata || "";
  document.getElementById('win-bota-bronce').value = adminConfig.winners.bota_bronce || "";
}

// Chronological sort function for matches
function compareMatchesChronologically(mA, mB) {
  const isGroupA = mA.phase === 'Group Stage';
  const isGroupB = mB.phase === 'Group Stage';
  
  if (isGroupA && !isGroupB) return -1;
  if (!isGroupA && isGroupB) return 1;
  
  if (isGroupA && isGroupB) {
    const numA = parseInt(mA.id.replace('M', ''));
    const numB = parseInt(mB.id.replace('M', ''));
    
    const grpA = Math.floor((numA - 1) / 6);
    const grpB = Math.floor((numB - 1) / 6);
    
    const idxA = (numA - 1) % 6;
    const idxB = (numB - 1) % 6;
    
    const jorA = idxA < 2 ? 1 : (idxA < 4 ? 2 : 3);
    const jorB = idxB < 2 ? 1 : (idxB < 4 ? 2 : 3);
    
    if (jorA !== jorB) return jorA - jorB;
    if (grpA !== grpB) return grpA - grpB;
    return idxA - idxB;
  } else {
    const numA = parseInt(mA.id.replace('M', ''));
    const numB = parseInt(mB.id.replace('M', ''));
    return numA - numB;
  }
}

// Render Admin Matches Rows
function renderMatchesList() {
  const container = document.getElementById('admin-matches-container');
  container.innerHTML = '';
  
  const sortedMatches = [...adminMatches].sort(compareMatchesChronologically);
  
  let html = '';
  sortedMatches.forEach(m => {
    const glValue = m.gl !== null ? m.gl : '';
    const gvValue = m.gv !== null ? m.gv : '';
    const pklValue = m.pkl !== null ? m.pkl : '';
    const pkvValue = m.pkv !== null ? m.pkv : '';
    
    const isKnockout = m.phase !== "Group Stage";
    // Check if score is a tie, display penalties inputs if so (in knockout stages)
    const isTie = isKnockout && m.gl !== null && m.gv !== null && parseInt(m.gl) === parseInt(m.gv);
    const pkDisplay = isTie ? 'inline-flex' : 'none';
    
    html += `
      <div class="match-admin-row" id="match-row-${m.id}">
        <div class="match-admin-info">
          <strong style="color: #fff; display: inline-flex; align-items: center; gap: 4px; flex-wrap: wrap;">${getFlagImgHtml(m.local)} ${m.local} <span style="font-weight: normal; color: var(--color-text-muted);">vs</span> ${getFlagImgHtml(m.visitor)} ${m.visitor}</strong><br>
          <small style="color: var(--color-text-muted);">Partido ${m.id} (${m.phase === 'Group Stage' ? 'Grupo ' + m.group : m.phase})</small>
        </div>
        
        <div class="match-admin-scores">
          <!-- Goles Inputs -->
          <input type="text" pattern="[0-9]*" class="admin-score-input" id="gl-${m.id}" value="${glValue}" placeholder="L" oninput="togglePKInputsVisibility('${m.id}')">
          <span style="color: var(--color-text-muted); font-weight: 800;">-</span>
          <input type="text" pattern="[0-9]*" class="admin-score-input" id="gv-${m.id}" value="${gvValue}" placeholder="V" oninput="togglePKInputsVisibility('${m.id}')">
          
          <!-- Penalties Inputs -->
          <div class="pk-inputs-group" id="pk-group-${m.id}" style="display: ${pkDisplay};">
            <span style="color: var(--accent-gold); font-size: 0.8rem; font-weight: 700; margin-right: 4px;">PK:</span>
            <input type="text" pattern="[0-9]*" class="admin-score-input" style="border-color: var(--accent-gold-glow); color: var(--accent-gold);" id="pkl-${m.id}" value="${pklValue}" placeholder="PL">
            <span style="color: var(--accent-gold-glow); font-weight: 800;">-</span>
            <input type="text" pattern="[0-9]*" class="admin-score-input" style="border-color: var(--accent-gold-glow); color: var(--accent-gold);" id="pkv-${m.id}" value="${pkvValue}" placeholder="PV">
          </div>
        </div>

        <div style="width: auto;">
          <button onclick="saveMatchScore('${m.id}')" class="btn btn-primary" style="padding: 6px 16px; font-size: 0.85rem; width: auto;">
            Guardar
          </button>
        </div>
      </div>
    `;
  });
  container.innerHTML = html;
}

// Show/hide penalties inputs dynamically when goals are edited
function togglePKInputsVisibility(matchId) {
  const match = adminMatches.find(m => m.id === matchId);
  const isKnockout = match.phase !== "Group Stage";
  if (!isKnockout) return;
  
  const gl = document.getElementById(`gl-${matchId}`).value;
  const gv = document.getElementById(`gv-${matchId}`).value;
  const pkGroup = document.getElementById(`pk-group-${matchId}`);
  
  if (gl !== '' && gv !== '' && parseInt(gl) === parseInt(gv)) {
    pkGroup.style.display = 'inline-flex';
  } else {
    pkGroup.style.display = 'none';
  }
}

// Save specific match goals/penalties to API
async function saveMatchScore(matchId) {
  const gl = document.getElementById(`gl-${matchId}`).value;
  const gv = document.getElementById(`gv-${matchId}`).value;
  const pkl = document.getElementById(`pkl-${matchId}`).value;
  const pkv = document.getElementById(`pkv-${matchId}`).value;
  
  // Form validation for tied knockout matches
  const match = adminMatches.find(m => m.id === matchId);
  const isKnockout = match.phase !== "Group Stage";
  if (isKnockout && gl !== '' && gv !== '' && parseInt(gl) === parseInt(gv)) {
    if (pkl === '' || pkv === '') {
      showToast("Fase eliminatoria: ingresa penaltis para desempatar el partido.", true);
      return;
    }
  }
  
  try {
    const res = await fetch(`/api/admin/matches/${matchId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gl, gv, pkl, pkv })
    });
    const data = await res.json();
    
    if (!res.ok) {
      showToast(data.error || "Error al registrar marcador", true);
    } else {
      showToast(data.message, false);
      // Update local cache
      const idx = adminMatches.findIndex(m => m.id === matchId);
      if (idx !== -1) {
        adminMatches[idx] = data.match;
      }
    }
  } catch (err) {
    console.error(err);
    showToast("Error de conexión con el servidor.", true);
  }
}

// Save Points Settings Configuration
async function savePointsConfig(e) {
  e.preventDefault();
  const outcome = document.getElementById('pts-outcome').value;
  const exact = document.getElementById('pts-exact').value;
  const balon_oro = document.getElementById('pts-oro').value;
  const balon_plata = document.getElementById('pts-plata').value;
  const balon_bronce = document.getElementById('pts-bronce').value;
  
  const points = {
    outcome, exact, balon_oro, balon_plata, balon_bronce,
    bota_oro: balon_oro, bota_plata: balon_plata, bota_bronce: balon_bronce
  };
  
  try {
    const res = await fetch('/api/admin/config-points', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ points })
    });
    const data = await res.json();
    if (res.ok) {
      showToast(data.message, false);
      adminConfig = data.config;
    } else {
      showToast(data.error || "Error al guardar configuración.", true);
    }
  } catch (err) {
    console.error(err);
    showToast("Error de conexión.", true);
  }
}

// Save Award Winners Configuration
async function saveWinnersConfig(e) {
  e.preventDefault();
  const winners = {
    balon_oro: document.getElementById('win-balon-oro').value,
    balon_plata: document.getElementById('win-balon-plata').value,
    balon_bronce: document.getElementById('win-balon-bronce').value,
    bota_oro: document.getElementById('win-bota-oro').value,
    bota_plata: document.getElementById('win-bota-plata').value,
    bota_bronce: document.getElementById('win-bota-bronce').value
  };
  
  try {
    const res = await fetch('/api/admin/config-winners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ winners })
    });
    const data = await res.json();
    if (res.ok) {
      showToast(data.message, false);
      adminConfig = data.config;
    } else {
      showToast(data.error || "Error al registrar ganadores.", true);
    }
  } catch (err) {
    console.error(err);
    showToast("Error de conexión.", true);
  }
}

async function handleLogout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/index.html';
}

async function changeAdminPassword(e) {
  e.preventDefault();
  const password = document.getElementById('new-admin-password').value;
  const confirmPassword = document.getElementById('confirm-admin-password').value;
  
  if (password !== confirmPassword) {
    showToast("Las contraseñas no coinciden.", true);
    return;
  }
  
  const btn = document.getElementById('change-pass-btn');
  btn.innerText = "Actualizando...";
  btn.disabled = true;
  
  try {
    const res = await fetch('/api/admin/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const data = await res.json();
    
    if (res.ok) {
      showToast(data.message, false);
      document.getElementById('admin-password-form').reset();
    } else {
      showToast(data.error || "Error al actualizar contraseña.", true);
    }
  } catch (err) {
    console.error(err);
    showToast("Error de conexión con el servidor.", true);
  } finally {
    btn.innerText = "Actualizar Contraseña";
    btn.disabled = false;
  }
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

// ==============================================================================
// PARTICIPANTS PREDICTIONS TAB FUNCTIONS (FOR ADMIN)
// ==============================================================================

let selectedUserPredictions = { matches: {}, specials: {} };
let selectedUserId = "";

// Tab switcher
function switchAdminTab(tabName) {
  document.querySelectorAll('.phase-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.admin-tab-content').forEach(c => c.style.display = 'none');
  
  if (tabName === 'results') {
    document.getElementById('tab-btn-results').classList.add('active');
    document.getElementById('admin-tab-results').style.display = 'block';
  } else if (tabName === 'predictions') {
    document.getElementById('tab-btn-predictions').classList.add('active');
    document.getElementById('admin-tab-predictions').style.display = 'block';
    loadUsersListForAdmin();
  } else if (tabName === 'settings') {
    document.getElementById('tab-btn-settings').classList.add('active');
    document.getElementById('admin-tab-settings').style.display = 'block';
  }
}

// Load participants dropdown list
async function loadUsersListForAdmin() {
  try {
    const res = await fetch('/api/leaderboard');
    const data = await res.json();
    
    const select = document.getElementById('admin-user-select');
    const currentVal = select.value;
    
    select.innerHTML = '<option value="">-- Selecciona un usuario --</option>';
    
    data.leaderboard.forEach(p => {
      const option = document.createElement('option');
      option.value = p.userId;
      option.textContent = p.username;
      select.appendChild(option);
    });
    
    if (currentVal) {
      select.value = currentVal;
    }
  } catch (err) {
    console.error("Error loading users list for admin:", err);
    showToast("Error al cargar la lista de usuarios.", true);
  }
}

// Fetch selected participant's predictions
async function loadUserPredictionsForAdmin(userId) {
  selectedUserId = userId;
  const viewDiv = document.getElementById('admin-user-predictions-view');
  
  if (!userId) {
    viewDiv.style.display = 'none';
    return;
  }
  
  try {
    const res = await fetch(`/api/predictions/${userId}`);
    if (!res.ok) {
      const data = await res.json();
      showToast(data.error || "Error al cargar predicciones", true);
      viewDiv.style.display = 'none';
      return;
    }
    
    selectedUserPredictions = await res.json();
    if (!selectedUserPredictions.matches) selectedUserPredictions.matches = {};
    if (!selectedUserPredictions.specials) selectedUserPredictions.specials = {};
    
    renderUserMatchesList();
    renderUserAwardsForAdmin();
    
    viewDiv.style.display = 'block';
  } catch (err) {
    console.error("Error loading user predictions:", err);
    showToast("Error al conectar con el servidor.", true);
    viewDiv.style.display = 'none';
  }
}

// Render participant's predicted matches
function renderUserMatchesList() {
  const container = document.getElementById('admin-user-matches-container');
  container.innerHTML = '';
  
  const sortedMatches = [...adminMatches].sort(compareMatchesChronologically);
  
  let html = '';
  sortedMatches.forEach(m => {
    const pred = selectedUserPredictions.matches[m.id] || { gl: '', gv: '', pkl: '', pkv: '' };
    
    const glValue = pred.gl !== undefined && pred.gl !== null ? pred.gl : '';
    const gvValue = pred.gv !== undefined && pred.gv !== null ? pred.gv : '';
    const pklValue = pred.pkl !== undefined && pred.pkl !== null ? pred.pkl : '';
    const pkvValue = pred.pkv !== undefined && pred.pkv !== null ? pred.pkv : '';
    
    const isKnockout = m.phase !== "Group Stage";
    const isTie = isKnockout && glValue !== '' && gvValue !== '' && parseInt(glValue) === parseInt(gvValue);
    const pkDisplay = isTie ? 'inline-flex' : 'none';
    
    html += `
      <div class="match-admin-row" id="pred-match-row-${m.id}">
        <div class="match-admin-info">
          <strong style="color: #fff; display: inline-flex; align-items: center; gap: 4px; flex-wrap: wrap;">
            ${getFlagImgHtml(m.local)} ${m.local} 
            <span style="font-weight: normal; color: var(--color-text-muted);">vs</span> 
            ${getFlagImgHtml(m.visitor)} ${m.visitor}
          </strong><br>
          <small style="color: var(--color-text-muted);">Partido ${m.id} (${m.phase === 'Group Stage' ? 'Grupo ' + m.group : m.phase})</small>
        </div>
        
        <div class="match-admin-scores">
          <!-- Goles Inputs -->
          <input type="text" pattern="[0-9]*" class="admin-score-input" id="pred-gl-${m.id}" value="${glValue}" placeholder="L" oninput="togglePredPKInputsVisibility('${m.id}')">
          <span style="color: var(--color-text-muted); font-weight: 800;">-</span>
          <input type="text" pattern="[0-9]*" class="admin-score-input" id="pred-gv-${m.id}" value="${gvValue}" placeholder="V" oninput="togglePredPKInputsVisibility('${m.id}')">
          
          <!-- Penalties Inputs -->
          <div class="pk-inputs-group" id="pred-pk-group-${m.id}" style="display: ${pkDisplay};">
            <span style="color: var(--accent-gold); font-size: 0.8rem; font-weight: 700; margin-right: 4px;">PK:</span>
            <input type="text" pattern="[0-9]*" class="admin-score-input" style="border-color: var(--accent-gold-glow); color: var(--accent-gold);" id="pred-pkl-${m.id}" value="${pklValue}" placeholder="PL">
            <span style="color: var(--accent-gold-glow); font-weight: 800;">-</span>
            <input type="text" pattern="[0-9]*" class="admin-score-input" style="border-color: var(--accent-gold-glow); color: var(--accent-gold);" id="pred-pkv-${m.id}" value="${pkvValue}" placeholder="PV">
          </div>
        </div>
      </div>
    `;
  });
  container.innerHTML = html;
}

// Dynamic visibility of predicted penalties inputs
function togglePredPKInputsVisibility(matchId) {
  const match = adminMatches.find(m => m.id === matchId);
  const isKnockout = match.phase !== "Group Stage";
  if (!isKnockout) return;
  
  const gl = document.getElementById(`pred-gl-${matchId}`).value.trim();
  const gv = document.getElementById(`pred-gv-${matchId}`).value.trim();
  const pkGroup = document.getElementById(`pred-pk-group-${matchId}`);
  
  if (gl !== '' && gv !== '' && parseInt(gl) === parseInt(gv)) {
    pkGroup.style.display = 'inline-flex';
  } else {
    pkGroup.style.display = 'none';
  }
}

// Render participant's predicted awards (Player Names)
function renderUserAwardsForAdmin() {
  const container = document.getElementById('admin-user-specials-container');
  container.innerHTML = '';
  
  const awards = [
    { id: "balon_oro", label: "Balón de Oro (Mejor Jugador)", color: "var(--accent-gold)", icon: "👑" },
    { id: "balon_plata", label: "Balón de Plata", color: "hsl(0, 0%, 75%)", icon: "🥈" },
    { id: "balon_bronce", label: "Balón de Bronce", color: "hsl(20, 60%, 55%)", icon: "🥉" },
    { id: "bota_oro", label: "Bota de Oro (Máximo Goleador)", color: "var(--accent-gold)", icon: "⚽" },
    { id: "bota_plata", label: "Bota de Plata", color: "hsl(0, 0%, 75%)", icon: "🥈" },
    { id: "bota_bronce", label: "Bota de Bronce", color: "hsl(20, 60%, 55%)", icon: "🥉" }
  ];
  
  awards.forEach(a => {
    const val = selectedUserPredictions.specials[a.id] || "";
    
    const div = document.createElement('div');
    div.className = 'special-select-group';
    div.innerHTML = `
      <div class="card" style="padding: 16px; background: rgba(0,0,0,0.2); border-color: rgba(255,255,255,0.05); display: flex; flex-direction: column; gap: 8px; width: 100%;">
        <label class="form-label" for="admin-award-input-${a.id}" style="color: ${a.color}; font-weight: 800; font-size: 0.9rem; display: flex; align-items: center; gap: 6px; margin-bottom: 0;">
          <span style="font-size: 1.2rem;">${a.icon}</span> ${a.label}
        </label>
        <input type="text" id="admin-award-input-${a.id}" class="form-control" value="${val}" placeholder="Nombre del jugador..." oninput="onAdminAwardInputChange('${a.id}', this.value)" style="background: rgba(0,0,0,0.4); border-color: var(--border-color);">
      </div>
    `;
    container.appendChild(div);
  });
}

function onAdminAwardInputChange(awardId, val) {
  selectedUserPredictions.specials[awardId] = val;
}

// Save participant predictions back to database via API
async function saveUserPredictionsAsAdmin() {
  if (!selectedUserId) {
    showToast("Por favor, selecciona un usuario primero.", true);
    return;
  }
  
  const matchesPayload = {};
  for (const m of adminMatches) {
    const gl = document.getElementById(`pred-gl-${m.id}`).value.trim();
    const gv = document.getElementById(`pred-gv-${m.id}`).value.trim();
    const pkl = document.getElementById(`pred-pkl-${m.id}`)?.value.trim() || '';
    const pkv = document.getElementById(`pred-pkv-${m.id}`)?.value.trim() || '';
    
    const finalGl = gl === '' ? '' : parseInt(gl);
    const finalGv = gv === '' ? '' : parseInt(gv);
    const finalPkl = pkl === '' ? '' : parseInt(pkl);
    const finalPkv = pkv === '' ? '' : parseInt(pkv);
    
    if (gl !== '' && !/^\d+$/.test(gl)) {
      showToast(`Marcador de goles local inválido para el partido ${m.id} (${m.local} vs ${m.visitor}).`, true);
      return;
    }
    if (gv !== '' && !/^\d+$/.test(gv)) {
      showToast(`Marcador de goles visitante inválido para el partido ${m.id} (${m.local} vs ${m.visitor}).`, true);
      return;
    }
    
    const isKnockout = m.phase !== "Group Stage";
    if (isKnockout && gl !== '' && gv !== '' && parseInt(gl) === parseInt(gv)) {
      if (pkl === '' || pkv === '') {
        showToast(`Partido ${m.id} (${m.local} vs ${m.visitor}): Ingresa penaltis para desempatar en fase eliminatoria.`, true);
        return;
      }
      if (pkl !== '' && !/^\d+$/.test(pkl)) {
        showToast(`Marcador de penaltis local inválido para el partido ${m.id}.`, true);
        return;
      }
      if (pkv !== '' && !/^\d+$/.test(pkv)) {
        showToast(`Marcador de penaltis visitante inválido para el partido ${m.id}.`, true);
        return;
      }
    }
    
    matchesPayload[m.id] = {
      gl: finalGl,
      gv: finalGv,
      pkl: finalPkl,
      pkv: finalPkv
    };
  }
  
  const specialsPayload = {
    balon_oro: document.getElementById('admin-award-input-balon_oro').value.trim(),
    balon_plata: document.getElementById('admin-award-input-balon_plata').value.trim(),
    balon_bronce: document.getElementById('admin-award-input-balon_bronce').value.trim(),
    bota_oro: document.getElementById('admin-award-input-bota_oro').value.trim(),
    bota_plata: document.getElementById('admin-award-input-bota_plata').value.trim(),
    bota_bronce: document.getElementById('admin-award-input-bota_bronce').value.trim()
  };
  
  const btn = document.getElementById('save-user-pred-btn');
  btn.innerText = "Guardando...";
  btn.disabled = true;
  
  try {
    const res = await fetch(`/api/predictions/${selectedUserId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matches: matchesPayload, specials: specialsPayload })
    });
    const data = await res.json();
    
    if (res.ok) {
      showToast("Pronósticos del participante guardados con éxito.", false);
      await loadUserPredictionsForAdmin(selectedUserId);
    } else {
      showToast(data.error || "Error al guardar pronósticos.", true);
    }
  } catch (err) {
    console.error("Error saving predictions as admin:", err);
    showToast("Error de conexión con el servidor.", true);
  } finally {
    btn.innerText = "Guardar Pronósticos del Usuario";
    btn.disabled = false;
  }
}

// ==============================================================================
// RESET DATA FUNCTION
// ==============================================================================

async function confirmResetData() {
  const firstConfirm = confirm(
    '⚠️ ¿Estás seguro de que quieres borrar TODOS los datos?\n\n' +
    'Esto eliminará:\n' +
    '• Todas las predicciones de todos los participantes\n' +
    '• Todos los resultados de partidos\n' +
    '• El historial de ranking\n' +
    '• Los ganadores oficiales de trofeos\n\n' +
    'Las cuentas de usuario y contraseñas se mantienen.'
  );
  
  if (!firstConfirm) return;
  
  const typed = prompt(
    'Para confirmar, escribe BORRAR en mayúsculas:'
  );
  
  if (typed !== 'BORRAR') {
    showToast('Operación cancelada. No se ha borrado nada.', true);
    return;
  }
  
  const btn = document.getElementById('reset-data-btn');
  btn.innerText = 'Borrando...';
  btn.disabled = true;
  
  try {
    const res = await fetch('/api/admin/reset-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    
    if (res.ok) {
      showToast(data.message, false);
      // Reload the admin dashboard to reflect empty state
      setTimeout(() => loadAdminDashboard(), 1000);
    } else {
      showToast(data.error || 'Error al resetear datos.', true);
    }
  } catch (err) {
    console.error('Error resetting data:', err);
    showToast('Error de conexión con el servidor.', true);
  } finally {
    btn.innerText = '🗑️ Borrar Todos los Datos';
    btn.disabled = false;
  }
}

// Bind to window global scope for inline event handlers in admin.html
window.switchAdminTab = switchAdminTab;
window.loadUserPredictionsForAdmin = loadUserPredictionsForAdmin;
window.onAdminAwardInputChange = onAdminAwardInputChange;
window.saveUserPredictionsAsAdmin = saveUserPredictionsAsAdmin;
window.togglePredPKInputsVisibility = togglePredPKInputsVisibility;
window.confirmResetData = confirmResetData;

