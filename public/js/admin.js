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
    const greetingMob = document.getElementById('user-greeting-mobile');
    if (greetingMob) greetingMob.innerText = `Admin: ${currentUser.username}`;
    const adminNavMob = document.getElementById('admin-nav-link-mobile');
    if (adminNavMob) adminNavMob.style.display = 'inline-block';
  }
}

let adminUserPredictions = null;

// Load configurations and matches list
async function loadAdminDashboard() {
  try {
    const res = await fetch('/api/admin/dashboard');
    const data = await res.json();
    
    adminMatches = data.matches;
    adminConfig = data.config;
    
    if (currentUser && currentUser.id) {
      try {
        const pRes = await fetch(`/api/predictions/${currentUser.id}`);
        if (pRes.ok) {
          adminUserPredictions = await pRes.json();
        }
      } catch (e) {}
    }
    
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
    
    const auguryHtml = getMatchAuguryHtml(m, adminUserPredictions, adminMatches);

    html += `
      <div class="match-admin-row" id="match-row-${m.id}" style="flex-wrap: wrap;">
        <div class="match-admin-info" style="flex: 1 1 300px;">
          <strong style="color: #fff; display: inline-flex; align-items: center; gap: 4px; flex-wrap: wrap;">${getFlagImgHtml(m.local)} ${m.local} <span style="font-weight: normal; color: var(--color-text-muted);">vs</span> ${getFlagImgHtml(m.visitor)} ${m.visitor}</strong><br>
          <small style="color: var(--color-text-muted);">Partido ${m.id} (${m.phase === 'Group Stage' ? 'Grupo ' + m.group : m.phase})${m.date ? ` • ${m.date} | ${m.time}` : ''}</small>
          ${auguryHtml}
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
  scrollToFirstPendingMatch();
}

// Auto-scroll admin matches to first pending match
function scrollToFirstPendingMatch() {
  const sortedMatches = [...adminMatches].sort(compareMatchesChronologically);
  const pendingMatch = sortedMatches.find(m => m.gl === null || m.gv === null);
  if (pendingMatch) {
    setTimeout(() => {
      const row = document.getElementById(`match-row-${pendingMatch.id}`);
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  }
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
    scrollToFirstPendingMatch();
  } else if (tabName === 'predictions') {
    document.getElementById('tab-btn-predictions').classList.add('active');
    document.getElementById('admin-tab-predictions').style.display = 'block';
    loadUsersListForAdmin();
  } else if (tabName === 'settings') {
    document.getElementById('tab-btn-settings').classList.add('active');
    document.getElementById('admin-tab-settings').style.display = 'block';
  }
}

// Global cache for users list
let adminUsersCache = [];

// Load participants dropdown list
async function loadUsersListForAdmin() {
  try {
    const res = await fetch('/api/admin/users');
    const users = await res.json();
    
    adminUsersCache = users;
    
    const select = document.getElementById('admin-user-select');
    const currentVal = select.value;
    
    select.innerHTML = '<option value="">-- Selecciona un usuario --</option>';
    
    users.forEach(u => {
      if (u.isAdmin && u.username !== "Sergio B") return;
      const option = document.createElement('option');
      option.value = u.id;
      option.textContent = u.username;
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

// Show/hide date-picker based on override checkbox status
function toggleOverrideInput(section) {
  const checkbox = document.getElementById(`override-enable-${section}`);
  const timeInput = document.getElementById(`override-time-${section}`);
  if (checkbox.checked) {
    timeInput.style.display = 'block';
    if (!timeInput.value) {
      const now = new Date();
      now.setHours(now.getHours() + 2); // default to 2 hours from now
      const tzOffset = now.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(now.getTime() - tzOffset)).toISOString().slice(0, 16);
      timeInput.value = localISOTime;
    }
  } else {
    timeInput.style.display = 'none';
  }
}

// Save participant config (Leaderboard visibility + unlocks)
async function saveUserConfig() {
  if (!selectedUserId) return;
  
  const showInLeaderboard = document.getElementById('user-show-leaderboard').checked;
  const unlockOverrides = {};
  
  const sections = ['groups', 'knockouts', 'awards'];
  for (const s of sections) {
    const checked = document.getElementById(`override-enable-${s}`).checked;
    if (checked) {
      const timeVal = document.getElementById(`override-time-${s}`).value;
      if (!timeVal) {
        showToast(`Por favor selecciona una fecha de expiración para la sección: ${s}`, true);
        return;
      }
      unlockOverrides[s] = new Date(timeVal).toISOString();
    } else {
      unlockOverrides[s] = null;
    }
  }
  
  const btn = document.getElementById('save-user-config-btn');
  btn.innerText = "Guardando...";
  btn.disabled = true;
  
  try {
    const res = await fetch(`/api/admin/users/${selectedUserId}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ showInLeaderboard, unlockOverrides })
    });
    const data = await res.json();
    
    if (res.ok) {
      showToast("Ajustes de usuario guardados con éxito.", false);
      await loadUsersListForAdmin(); // refresh cache
    } else {
      showToast(data.error || "Error al guardar ajustes.", true);
    }
  } catch (err) {
    console.error("Error saving user config:", err);
    showToast("Error de conexión con el servidor.", true);
  } finally {
    btn.innerText = "Guardar Ajustes de Usuario";
    btn.disabled = false;
  }
}

// Fetch selected participant's predictions
async function loadUserPredictionsForAdmin(userId) {
  selectedUserId = userId;
  const viewDiv = document.getElementById('admin-user-predictions-view');
  const configDiv = document.getElementById('admin-user-config-panel');
  
  if (!userId) {
    viewDiv.style.display = 'none';
    configDiv.style.display = 'none';
    return;
  }
  
  // Find user details from cache and populate
  const user = adminUsersCache.find(u => u.id === userId);
  if (user) {
    document.getElementById('user-show-leaderboard').checked = user.showInLeaderboard !== false;
    
    const overrides = user.unlockOverrides || {};
    const sections = ['groups', 'knockouts', 'awards'];
    sections.forEach(s => {
      const checkbox = document.getElementById(`override-enable-${s}`);
      const timeInput = document.getElementById(`override-time-${s}`);
      
      if (overrides[s]) {
        checkbox.checked = true;
        const dateObj = new Date(overrides[s]);
        const tzOffset = dateObj.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(dateObj.getTime() - tzOffset)).toISOString().slice(0, 16);
        timeInput.value = localISOTime;
        timeInput.style.display = 'block';
      } else {
        checkbox.checked = false;
        timeInput.value = '';
        timeInput.style.display = 'none';
      }
    });
  }
  
  try {
    const res = await fetch(`/api/predictions/${userId}`);
    if (!res.ok) {
      const data = await res.json();
      showToast(data.error || "Error al cargar predicciones", true);
      viewDiv.style.display = 'none';
      configDiv.style.display = 'none';
      return;
    }
    
    selectedUserPredictions = await res.json();
    if (!selectedUserPredictions.matches) selectedUserPredictions.matches = {};
    if (!selectedUserPredictions.specials) selectedUserPredictions.specials = {};
    
    renderUserMatchesList();
    renderUserAwardsForAdmin();
    
    document.querySelector('#admin-user-config-panel h3').innerText = `⚙️ Ajustes de Participante: ${user ? user.username : userId}`;
    configDiv.style.display = 'block';
    viewDiv.style.display = 'block';
  } catch (err) {
    console.error("Error loading user predictions:", err);
    showToast("Error al conectar con el servidor.", true);
    viewDiv.style.display = 'none';
    configDiv.style.display = 'none';
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
    
    const auguryHtml = getMatchAuguryHtml(m, selectedUserPredictions, adminMatches);

    html += `
      <div class="match-admin-row" id="pred-match-row-${m.id}" style="flex-wrap: wrap;">
        <div class="match-admin-info" style="flex: 1 1 300px;">
          <strong style="color: #fff; display: inline-flex; align-items: center; gap: 4px; flex-wrap: wrap;">
            ${getFlagImgHtml(m.local)} ${m.local} 
            <span style="font-weight: normal; color: var(--color-text-muted);">vs</span> 
            ${getFlagImgHtml(m.visitor)} ${m.visitor}
          </strong><br>
          <small style="color: var(--color-text-muted);">Partido ${m.id} (${m.phase === 'Group Stage' ? 'Grupo ' + m.group : m.phase})${m.date ? ` • ${m.date} | ${m.time}` : ''}</small>
          ${auguryHtml}
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
  }
}

function exportFullBackup() {
  window.location.href = '/api/admin/export-database';
}

// Bind to window global scope for inline event handlers in admin.html
window.switchAdminTab = switchAdminTab;
window.loadUserPredictionsForAdmin = loadUserPredictionsForAdmin;
window.onAdminAwardInputChange = onAdminAwardInputChange;
window.saveUserPredictionsAsAdmin = saveUserPredictionsAsAdmin;
window.togglePredPKInputsVisibility = togglePredPKInputsVisibility;
window.confirmResetData = confirmResetData;
window.toggleOverrideInput = toggleOverrideInput;
window.saveUserConfig = saveUserConfig;
window.exportFullBackup = exportFullBackup;

function getMatchWinner(local, visitor, gl, gv, pkl, pkv) {
  if (gl === '' || gl === undefined || gl === null || gv === '' || gv === undefined || gv === null) return null;
  const goalsL = parseInt(gl);
  const goalsV = parseInt(gv);
  if (goalsL > goalsV) return local;
  if (goalsV > goalsL) return visitor;
  if (pkl !== '' && pkl !== undefined && pkl !== null && pkv !== '' && pkv !== undefined && pkv !== null) {
    const pkL = parseInt(pkl);
    const pkV = parseInt(pkv);
    if (pkL > pkV) return local;
    if (pkV > pkL) return visitor;
  }
  return null;
}

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
    { id: "M75", label: "D1", lRef: "1B", vRef: "3o Top 2" }, { id: "M76", label: "D2", lRef: "1C", vRef: "3o Top 3" }, { id: "M73", label: "D3", lRef: "1A", vRef: "3o Top 1" }, { id: "M77", label: "D4", lRef: "2C", vRef: "2D" },
    { id: "M84", label: "D5", lRef: "1H", vRef: "3o Top 8" }, { id: "M83", label: "D6", lRef: "2G", vRef: "2H" }, { id: "M82", label: "D7", lRef: "1G", vRef: "3o Top 7" }, { id: "M81", label: "D8", lRef: "1F", vRef: "3o Top 6" },
    { id: "M74", label: "D9", lRef: "2A", vRef: "2B" }, { id: "M78", label: "D10", lRef: "1D", vRef: "3o Top 4" }, { id: "M79", label: "D11", lRef: "1E", vRef: "3o Top 5" }, { id: "M80", label: "D12", lRef: "2E", vRef: "2F" },
    { id: "M86", label: "D13", lRef: "1J", vRef: "2K" }, { id: "M85", label: "D14", lRef: "1I", vRef: "2J" }, { id: "M88", label: "D15", lRef: "1L", vRef: "2I" }, { id: "M87", label: "D16", lRef: "1K", vRef: "2L" }
  ];
  r32Matches.forEach(m => {
    const local = advanceTeams[m.lRef]; const visitor = advanceTeams[m.vRef];
    const pred = predObj.matches[m.id] || { gl: '', gv: '', pkl: '', pkv: '' };
    const winner = getMatchWinner(local, visitor, pred.gl, pred.gv, pred.pkl, pred.pkv);
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
    const winner = getMatchWinner(local, visitor, pred.gl, pred.gv, pred.pkl, pred.pkv);
    const loser = (winner === local) ? visitor : ((winner === visitor) ? local : null);
    bracketTeams[m.label] = winner; userMatches[m.id] = { local, visitor, winner, loser };
  });
  const r8Matches = [ { id: "M97", label: "C1", lRef: "O1", vRef: "O2" }, { id: "M98", label: "C2", lRef: "O3", vRef: "O4" }, { id: "M99", label: "C3", lRef: "O5", vRef: "O6" }, { id: "M100", label: "C4", lRef: "O7", vRef: "O8" } ];
  r8Matches.forEach(m => {
    const local = bracketTeams[m.lRef] || `Ganador ${m.lRef}`; const visitor = bracketTeams[m.vRef] || `Ganador ${m.vRef}`;
    const pred = predObj.matches[m.id] || { gl: '', gv: '', pkl: '', pkv: '' };
    const winner = getMatchWinner(local, visitor, pred.gl, pred.gv, pred.pkl, pred.pkv);
    const loser = (winner === local) ? visitor : ((winner === visitor) ? local : null);
    bracketTeams[m.label] = winner; userMatches[m.id] = { local, visitor, winner, loser };
  });
  const s1Local = bracketTeams["C1"] || "Ganador C1"; const s1Visitor = bracketTeams["C2"] || "Ganador C2";
  const s2Local = bracketTeams["C3"] || "Ganador C3"; const s2Visitor = bracketTeams["C4"] || "Ganador C4";
  const s1Pred = predObj.matches["M101"] || { gl: '', gv: '', pkl: '', pkv: '' }; const s2Pred = predObj.matches["M102"] || { gl: '', gv: '', pkl: '', pkv: '' };
  const s1Winner = getMatchWinner(s1Local, s1Visitor, s1Pred.gl, s1Pred.gv, s1Pred.pkl, s1Pred.pkv); const s2Winner = getMatchWinner(s2Local, s2Visitor, s2Pred.gl, s2Pred.gv, s2Pred.pkl, s2Pred.pkv);
  const s1Loser = s1Winner ? ((s1Winner === s1Local) ? s1Visitor : s1Local) : null; const s2Loser = s2Winner ? ((s2Winner === s2Local) ? s2Visitor : s2Local) : null;
  userMatches["M101"] = { local: s1Local, visitor: s1Visitor, winner: s1Winner, loser: s1Loser }; userMatches["M102"] = { local: s2Local, visitor: s2Visitor, winner: s2Winner, loser: s2Loser };
  const t3Local = s1Loser || "Perdedor S1"; const t3Visitor = s2Loser || "Perdedor S2"; const t3Pred = predObj.matches["M103"] || { gl: '', gv: '', pkl: '', pkv: '' };
  const t3Winner = getMatchWinner(t3Local, t3Visitor, t3Pred.gl, t3Pred.gv, t3Pred.pkl, t3Pred.pkv); const t3Loser = t3Winner ? ((t3Winner === t3Local) ? t3Visitor : t3Local) : null;
  userMatches["M103"] = { local: t3Local, visitor: t3Visitor, winner: t3Winner, loser: t3Loser };
  const finalLocal = s1Winner || "Ganador S1"; const finalVisitor = s2Winner || "Ganador S2"; const finalPred = predObj.matches["M104"] || { gl: '', gv: '', pkl: '', pkv: '' };
  const finalWinner = getMatchWinner(finalLocal, finalVisitor, finalPred.gl, finalPred.gv, finalPred.pkl, finalPred.pkv); const finalLoser = finalWinner ? ((finalWinner === finalLocal) ? finalVisitor : finalLocal) : null;
  userMatches["M104"] = { local: finalLocal, visitor: finalVisitor, winner: finalWinner, loser: finalLoser };
  return userMatches;
}

function getMatchAuguryHtml(m, userPredObj, dbMatches) {
  if (!userPredObj || !userPredObj.matches || m.phase === 'Group Stage') return '';
  const userMatches = calculateUserBracket(userPredObj, dbMatches);
  const usrMatch = userMatches[m.id];
  if (usrMatch && usrMatch.local && usrMatch.visitor) {
    if ((usrMatch.local === m.local && usrMatch.visitor === m.visitor) || (usrMatch.local === m.visitor && usrMatch.visitor === m.local)) {
      const p = userPredObj.matches[m.id];
      const pStr = (p && p.gl !== undefined && p.gl !== '' && p.gl !== null) ? `${p.gl}-${p.gv}${p.pkl ? ` (PK ${p.pkl}-${p.pkv})` : ''}` : 'Sin pronóstico';
      return `<div style="font-size: 0.75rem; color: #f59e0b; margin-top: 6px; background: rgba(245,158,11,0.08); padding: 5px 10px; border-radius: 8px; border: 1px solid rgba(245,158,11,0.2);">
        🎯 <strong>Mismo cruce en porra:</strong> Pronosticado <strong>${usrMatch.local} vs ${usrMatch.visitor}</strong> (${pStr} • Gana <strong>${usrMatch.winner}</strong>)
      </div>`;
    }
  }
  const getTeamInfo = (tName) => {
    if (!tName || tName.startsWith('Ganador') || tName.startsWith('Perdedor') || tName.startsWith('Local') || tName.startsWith('Visitante') || tName.startsWith('1º') || tName.startsWith('2º') || tName.startsWith('3º')) return null;
    const teamMatches = [];
    Object.keys(userMatches).forEach(mId => {
      const um = userMatches[mId];
      if (um.local === tName || um.visitor === tName) {
        const opp = (um.local === tName) ? um.visitor : um.local;
        teamMatches.push({ mId, opp, won: um.winner === tName, winner: um.winner });
      }
    });
    return teamMatches;
  };
  const locInfo = getTeamInfo(m.local);
  const visInfo = getTeamInfo(m.visitor);
  if (!locInfo && !visInfo) return '';
  let locText = locInfo && locInfo.length > 0 ? `<strong>${m.local}</strong>: En su porra juega en <strong>${locInfo[0].mId}</strong> vs ${locInfo[0].opp} (${locInfo[0].won ? 'Gana ' + m.local : 'Gana ' + locInfo[0].winner})` : (m.local && !m.local.startsWith('Ganador') && !m.local.startsWith('1º') ? `<strong>${m.local}</strong>: No avanzó en porra` : '');
  let visText = visInfo && visInfo.length > 0 ? `<strong>${m.visitor}</strong>: En su porra juega en <strong>${visInfo[0].mId}</strong> vs ${visInfo[0].opp} (${visInfo[0].won ? 'Gana ' + m.visitor : 'Gana ' + visInfo[0].winner})` : (m.visitor && !m.visitor.startsWith('Ganador') && !m.visitor.startsWith('1º') ? `<strong>${m.visitor}</strong>: No avanzó en porra` : '');
  return `<div style="font-size: 0.72rem; color: #cbd5e1; margin-top: 6px; background: rgba(255,255,255,0.04); padding: 5px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); line-height: 1.4;">
    💡 <strong>Pronóstico augurado para este partido:</strong><br>
    ${locText ? `• ${locText}<br>` : ''}
    ${visText ? `• ${visText}` : ''}
  </div>`;
}


