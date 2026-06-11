// Dictionary of teams for award winners select lists
const TEAMS_LIST = [
  "Alemania", "Arabia Saudi", "Argelia", "Argentina", "Australia", "Austria",
  "Belgica", "Bosnia y Herzegovina", "Brasil", "Cabo Verde", "Canada", "Catar",
  "Colombia", "Corea del Sur", "Costa de Marfil", "Croacia", "Curazao",
  "Ecuador", "Egipto", "Escocia", "Espana", "Estados Unidos", "Francia",
  "Ghana", "Haiti", "Inglaterra", "Iran", "Irak", "Japon", "Jordania",
  "Marruecos", "Mexico", "Noruega", "Nueva Zelanda", "Paises Bajos", "Panama",
  "Paraguay", "Portugal", "RD Congo", "Rep. Checa", "Senegal", "Sudafrica",
  "Suecia", "Suiza", "Tunez", "Turquia", "Uruguay", "Uzbekistan"
];

let currentUser = null;
let adminMatches = [];
let adminConfig = {};

document.addEventListener("DOMContentLoaded", async () => {
  await verifySession();
  await loadAdminDashboard();
  populateWinnersSelectLists();
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

// Populate select lists options
function populateWinnersSelectLists() {
  const selects = [
    'win-balon-oro', 'win-balon-plata', 'win-balon-bronce',
    'win-bota-oro', 'win-bota-plata', 'win-bota-bronce'
  ];
  
  selects.forEach(id => {
    const el = document.getElementById(id);
    let html = '<option value="">-- Sin definir --</option>';
    TEAMS_LIST.forEach(t => {
      html += `<option value="${t}">${t}</option>`;
    });
    el.innerHTML = html;
  });
}

// Render Admin Matches Rows
function renderMatchesList() {
  const container = document.getElementById('admin-matches-container');
  container.innerHTML = '';
  
  let html = '';
  adminMatches.forEach(m => {
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
          <strong style="color: #fff;">${m.local} vs ${m.visitor}</strong><br>
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
