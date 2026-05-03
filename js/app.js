// ── Entry point for index.html ─────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const user = Auth.getCurrentUser();
  if (user) {
    renderApp(user);
  } else {
    setupLogin();
  }
});

// ── Login ──────────────────────────────────────────

function setupLogin() {
  const emailInp = document.getElementById('email');
  const btnLogin = document.getElementById('btn-login');
  if (!emailInp || !btnLogin) return;

  btnLogin.addEventListener('click', doLogin);
  emailInp.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  emailInp.addEventListener('blur', () => validateEmail(true));
  emailInp.addEventListener('input', () => { if (emailInp.classList.contains('err')) validateEmail(false); });
}

function validateEmail(showEmpty) {
  const emailInp  = document.getElementById('email');
  const emailErr  = document.getElementById('email-err');
  const emailErrT = document.getElementById('email-err-txt');
  const val = emailInp.value.trim();

  if (!val) {
    if (!showEmpty) return true;
    emailErrT.textContent = 'Ingresá tu email corporativo';
    emailInp.classList.add('err');
    emailErr.classList.add('show');
    return false;
  }
  const parts = val.split('@');
  if (parts.length !== 2 || parts[1].toLowerCase() !== FIXY_CONFIG.allowedDomain) {
    emailErrT.textContent = 'Solo se permiten cuentas @' + FIXY_CONFIG.allowedDomain;
    emailInp.classList.add('err');
    emailErr.classList.add('show');
    return false;
  }
  emailInp.classList.remove('err');
  emailErr.classList.remove('show');
  return true;
}

function doLogin() {
  if (!validateEmail(true)) return;
  const email = document.getElementById('email').value.trim();
  const result = Auth.login(email);
  if (!result.ok) {
    document.getElementById('email-err-txt').textContent = result.error;
    document.getElementById('email').classList.add('err');
    document.getElementById('email-err').classList.add('show');
    return;
  }
  const btn = document.getElementById('btn-login');
  btn.textContent = 'Ingresando…';
  btn.disabled = true;
  const sl = document.getElementById('screen-login');
  sl.style.cssText = 'opacity:0;transition:opacity .3s ease';
  setTimeout(() => {
    sl.style.display = 'none';
    renderApp(result.user);
  }, 320);
}

// ── App init ───────────────────────────────────────

function renderApp(rawUser) {
  const viewAsUser = Storage.getAdminViewAs();
  const user = (rawUser.isAdmin && viewAsUser)
    ? { ...rawUser, isAdmin: false, role: 'viewer', _adminViewAs: true }
    : rawUser;

  const appEl = document.getElementById('screen-app');
  appEl.classList.add('active');

  // Admin view banner
  if (rawUser.isAdmin && viewAsUser) {
    const banner = document.getElementById('admin-view-banner');
    if (banner) banner.style.display = 'flex';
  }

  applyUserToUI(user, rawUser);

  // Init modules
  Wall.init(user);
  SocialPreview.init(user);
  Dashboard.init(user);
  Chat.initSidebar(user);

  // Drag & drop for uploads (admin only)
  if (!viewAsUser && rawUser.isAdmin) setupDragDrop();
}

function applyUserToUI(user, rawUser) {
  const firstName = user.name.split(' ')[0];
  document.getElementById('user-greeting').textContent = firstName;
  document.getElementById('av-init').textContent = user.initials;
  document.getElementById('ac').style.display = rawUser.isAdmin && !Storage.getAdminViewAs() ? 'block' : 'none';

  // Welcome tag + date
  const d = new Date();
  const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const dateEl = document.getElementById('wdate');
  if (dateEl) dateEl.textContent = dias[d.getDay()] + ' ' + d.getDate() + ' de ' + meses[d.getMonth()];

  const roleTag = document.getElementById('role-tag');
  if (roleTag) {
    const viewAs = Storage.getAdminViewAs();
    roleTag.textContent = rawUser.isAdmin && !viewAs ? '👑 Admin' : 'Equipo';
  }

  // Admin button in header
  const adminBtn = document.getElementById('btn-admin');
  if (adminBtn) {
    const showAdmin = rawUser.isAdmin && !Storage.getAdminViewAs();
    adminBtn.style.display = showAdmin ? 'flex' : 'none';
  }

  // Admin-only elements (upload buttons, new post btn, quicklinks)
  const canAdmin = rawUser.isAdmin && !Storage.getAdminViewAs();
  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = canAdmin ? '' : 'none';
  });

  // Quick link to admin panel
  const qlAdmin = document.getElementById('qlink-admin');
  if (qlAdmin) qlAdmin.style.display = canAdmin ? 'flex' : 'none';

  // Logout button
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) logoutBtn.addEventListener('click', () => Auth.logout());

  // Admin button handler
  const adminBtnEl = document.getElementById('btn-admin');
  if (adminBtnEl) adminBtnEl.addEventListener('click', () => window.location.href = 'admin.html');

  // View-as-user return
  const returnBtn = document.getElementById('return-admin-btn');
  if (returnBtn) {
    returnBtn.addEventListener('click', () => {
      Storage.setAdminViewAs(false);
      location.reload();
    });
  }
}

// ── Post modal wiring ──────────────────────────────

function openPostModal() { Wall.openNew(); }

document.addEventListener('click', e => {
  const overlay = e.target.closest('.modal-overlay');
  if (overlay && e.target === overlay) overlay.classList.remove('open');
});

// ── Redes modal wiring ─────────────────────────────

function closeRM() { SocialPreview.closeEdit(); }
function saveRed()  { SocialPreview.save(); }

// ── Drag & drop Meta quick upload (dashboard) ──────

function setupDragDrop() {
  document.addEventListener('dragover', e => {
    if (e.target.closest('#meta-body')) e.preventDefault();
  });
  document.addEventListener('drop', e => {
    const zone = e.target.closest('#meta-body');
    if (!zone) return;
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
      handleQuickUpload('meta', 'MetaParser', file);
    }
  });
}

function handleQuickUpload(type, parserName, file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const parser = window[parserName];
      const report = parser.parse(e.target.result, file.name);
      Storage.saveReport(type, report);
      Storage.addActivity({ text: 'Reporte Meta Ads cargado', time: 'Ahora', dot: 'y' });
      Dashboard.refresh();
      Chat.refreshContext();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };
  reader.readAsText(file, 'UTF-8');
}
