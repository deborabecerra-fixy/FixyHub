// ── Entry point for index.html ───────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // In dev fallback mode show the dev notice on the login form
  if (typeof FIREBASE_CONFIGURED !== 'undefined' && !FIREBASE_CONFIGURED) {
    const notice = document.getElementById('dev-notice');
    if (notice) notice.style.display = 'block';
  }

  // Wire forgot-password navigation
  document.getElementById('btn-forgot')?.addEventListener('click', showForgot);
  document.getElementById('btn-back-login')?.addEventListener('click', showLoginForm);
  document.getElementById('btn-reset')?.addEventListener('click', doReset);

  // Wire password visibility toggle
  const pwToggle = document.getElementById('pw-toggle');
  const pwInput  = document.getElementById('password');
  if (pwToggle && pwInput) {
    pwToggle.addEventListener('click', () => {
      pwInput.type = pwInput.type === 'password' ? 'text' : 'password';
    });
  }

  // Listen for auth state — shows loading until Firebase (or fallback) resolves
  Auth.listenAuthState(({ authenticated, user }) => {
    document.getElementById('screen-loading').style.display = 'none';
    if (authenticated) {
      document.getElementById('screen-login').style.display = 'none';
      renderApp(user);
    } else {
      document.getElementById('screen-login').style.display = '';
      setupLogin();
    }
  });
});

// ── Forgot-password screens ───────────────────────────────────────────────────

function showForgot() {
  document.getElementById('login-form-wrap').style.display  = 'none';
  document.getElementById('forgot-form-wrap').style.display = '';
  const email = document.getElementById('email')?.value?.trim();
  if (email) {
    const ri = document.getElementById('reset-email');
    if (ri) ri.value = email;
  }
}

function showLoginForm() {
  document.getElementById('forgot-form-wrap').style.display = 'none';
  document.getElementById('login-form-wrap').style.display  = '';
  hideResetMessages();
}

function hideResetMessages() {
  document.getElementById('reset-err')?.classList.remove('show');
  document.getElementById('reset-ok') && (document.getElementById('reset-ok').style.display = 'none');
}

async function doReset() {
  const emailEl = document.getElementById('reset-email');
  const btn     = document.getElementById('btn-reset');
  const errEl   = document.getElementById('reset-err');
  const errTxt  = document.getElementById('reset-err-txt');
  const okEl    = document.getElementById('reset-ok');

  hideResetMessages();
  const email = emailEl?.value?.trim();
  if (!email) {
    errTxt.textContent = 'Ingresá tu email corporativo.';
    errEl.classList.add('show');
    return;
  }

  btn.textContent = 'Enviando…';
  btn.disabled = true;
  const result = await Auth.resetPassword(email);
  btn.textContent = 'Enviar link';
  btn.disabled = false;

  if (result.ok) {
    if (okEl) okEl.style.display = 'flex';
  } else {
    errTxt.textContent = result.error;
    errEl.classList.add('show');
  }
}

// ── Login form ────────────────────────────────────────────────────────────────

function setupLogin() {
  const emailInp = document.getElementById('email');
  const btnLogin = document.getElementById('btn-login');
  if (!emailInp || !btnLogin) return;

  btnLogin.addEventListener('click', doLogin);
  emailInp.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('password')?.focus(); });
  document.getElementById('password')?.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  emailInp.addEventListener('blur',  () => validateEmail(true));
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

async function doLogin() {
  if (!validateEmail(true)) return;

  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password')?.value || '';
  const btn      = document.getElementById('btn-login');
  const pwErr    = document.getElementById('pw-err');
  const pwErrTxt = document.getElementById('pw-err-txt');

  pwErr?.classList.remove('show');
  btn.textContent = 'Ingresando…';
  btn.disabled    = true;

  const result = await Auth.login(email, password);

  if (!result.ok) {
    btn.textContent = 'Ingresar al Hub';
    btn.disabled    = false;
    if (pwErrTxt && pwErr) {
      pwErrTxt.textContent = result.error;
      pwErr.classList.add('show');
    } else {
      document.getElementById('email-err-txt').textContent = result.error;
      document.getElementById('email').classList.add('err');
      document.getElementById('email-err').classList.add('show');
    }
    return;
  }

  // Animate out login screen — Firebase listenAuthState will call renderApp automatically
  // In fallback mode, renderApp is called manually here
  const sl = document.getElementById('screen-login');
  if (sl) { sl.style.cssText = 'opacity:0;transition:opacity .3s ease'; }
  setTimeout(() => {
    if (sl) sl.style.display = 'none';
    if (result.user) renderApp(result.user);
    // If Firebase mode, onAuthStateChanged already fired renderApp
  }, 300);
}

// ── App init ──────────────────────────────────────────────────────────────────

function renderApp(rawUser) {
  const viewAsUser = Storage.getAdminViewAs();
  const user = (rawUser.isAdmin && viewAsUser)
    ? { ...rawUser, isAdmin: false, role: 'viewer', _adminViewAs: true }
    : rawUser;

  const appEl = document.getElementById('screen-app');
  if (!appEl) return;
  appEl.style.display = '';
  appEl.classList.add('active');

  if (rawUser.isAdmin && viewAsUser) {
    const banner = document.getElementById('admin-view-banner');
    if (banner) banner.style.display = 'flex';
  }

  applyUserToUI(user, rawUser);

  Wall.init(user);
  SocialPreview.init(user);
  Dashboard.init(user);
  Chat.initSidebar(user);

  if (!viewAsUser && rawUser.isAdmin) setupDragDrop();
}

function applyUserToUI(user, rawUser) {
  const firstName = user.name.split(' ')[0];
  const el = id => document.getElementById(id);

  el('user-greeting').textContent = firstName;
  el('av-init').textContent       = user.initials;
  el('ac').style.display          = rawUser.isAdmin && !Storage.getAdminViewAs() ? 'block' : 'none';

  const d     = new Date();
  const dias  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const dateEl = el('wdate');
  if (dateEl) dateEl.textContent = dias[d.getDay()] + ' ' + d.getDate() + ' de ' + meses[d.getMonth()];

  const roleTag = el('role-tag');
  if (roleTag) {
    const viewAs = Storage.getAdminViewAs();
    roleTag.textContent = rawUser.isAdmin && !viewAs ? '👑 Admin' : 'Equipo';
  }

  const adminBtn = el('btn-admin');
  if (adminBtn) {
    const showAdmin = rawUser.isAdmin && !Storage.getAdminViewAs();
    adminBtn.style.display = showAdmin ? 'flex' : 'none';
    adminBtn.addEventListener('click', () => window.location.href = 'admin.html');
  }

  const canAdmin = rawUser.isAdmin && !Storage.getAdminViewAs();
  document.querySelectorAll('.admin-only').forEach(e => { e.style.display = canAdmin ? '' : 'none'; });

  const qlAdmin = el('qlink-admin');
  if (qlAdmin) qlAdmin.style.display = canAdmin ? 'flex' : 'none';

  el('btn-logout')?.addEventListener('click', () => Auth.logout());

  const returnBtn = el('return-admin-btn');
  if (returnBtn) {
    returnBtn.addEventListener('click', () => {
      Storage.setAdminViewAs(false);
      location.reload();
    });
  }
}

// ── Post / social modal wiring ────────────────────────────────────────────────

function openPostModal() { Wall.openNew(); }

document.addEventListener('click', e => {
  const overlay = e.target.closest('.modal-overlay');
  if (overlay && e.target === overlay) overlay.classList.remove('open');
});

function closeRM() { SocialPreview.closeEdit(); }
function saveRed()  { SocialPreview.save(); }

// ── Drag & drop Meta quick upload ─────────────────────────────────────────────

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
      handleQuickUpload(file);
    }
  });
}

function handleQuickUpload(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const report = MetaParser.parse(e.target.result, file.name);
      Storage.addReport('meta', report);
      Storage.addActivity({ text: 'Reporte Meta Ads cargado', time: 'Ahora', dot: 'y' });
      Dashboard.refresh();
      Chat.refreshContext();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };
  reader.readAsText(file, 'UTF-8');
}
