const Admin = (() => {
  let _user      = null;
  let _activeTab = 'users';

  // ── Users tab ────────────────────────────────────────────────────────────────
  function renderUsersTab() {
    const container = document.getElementById('tab-users');
    if (!container) return;
    const users  = Storage.getUsers();
    const viewAs = Storage.getAdminViewAs();

    const rows = users.map(u => {
      const isFixed    = Auth.isAdmin(u.email);
      const roleSelect = isFixed
        ? `<span class="role-badge admin">Admin</span>`
        : `<select class="role-select" onchange="Admin.changeRole('${u.email}', this.value)">
             <option value="viewer" ${(u.role || 'viewer') === 'viewer' ? 'selected' : ''}>Viewer</option>
             <option value="editor" ${(u.role || 'viewer') === 'editor' ? 'selected' : ''}>Editor</option>
           </select>`;

      return `
        <tr>
          <td><span class="user-init-sm">${u.initials || '?'}</span></td>
          <td>${u.email}${isFixed ? ' 👑' : ''}</td>
          <td>${roleSelect}</td>
          <td><span class="u-last">${u.loginAt ? new Date(u.loginAt).toLocaleDateString('es-AR') : '—'}</span></td>
        </tr>`;
    }).join('');

    const tbody = container.querySelector('tbody') || container.querySelector('.admin-table tbody');
    if (tbody) {
      tbody.innerHTML = users.length
        ? rows
        : '<tr><td colspan="4" class="empty-cell">Ningún usuario ha iniciado sesión todavía.</td></tr>';
    }

    const viewAsBtn = document.getElementById('view-as-user-btn');
    if (viewAsBtn) {
      viewAsBtn.textContent = viewAs ? '↩ Volver a vista Admin' : '👁️ Ver como usuario';
      viewAsBtn.classList.toggle('active-view', !!viewAs);
    }
  }

  // ── Reports tab ──────────────────────────────────────────────────────────────
  function renderReportsTab() {
    const container = document.getElementById('tab-reports');
    if (!container) return;
    const list = container.querySelector('.reports-list');
    if (!list) return;

    // ── Meta Ads: multiple CSV ──
    const metaReports = Storage.getReports('meta');
    const metaFilesHTML = metaReports.length
      ? metaReports.map(r => `
          <div class="report-file-item">
            <span class="report-status ok">✅ ${r.filename} · ${r.rowCount} filas · ${new Date(r.loadedAt).toLocaleDateString('es-AR')}</span>
            <button class="btn-sm danger" onclick="Admin.deleteMetaReport('${r.id}')">✕ Eliminar</button>
          </div>`).join('')
      : '<span class="report-status empty">Sin datos</span>';

    const metaSection = `
      <div class="report-row">
        <div class="report-info">
          <span class="report-name">Meta Ads</span>
          <div class="report-status-wrap">${metaFilesHTML}</div>
          ${metaReports.length > 1 ? `<div class="report-note">📊 ${metaReports.length} archivos se consolidan automáticamente en el dashboard.</div>` : ''}
        </div>
        <div class="report-actions">
          <input type="file" id="file-meta" accept=".csv" style="display:none" onchange="Admin.handleUploadMeta(this)"/>
          <button class="btn-sm" onclick="document.getElementById('file-meta').click()">
            📂 ${metaReports.length > 0 ? 'Agregar otro CSV' : 'Subir CSV'}
          </button>
        </div>
      </div>`;

    // ── Google Ads & Kommo: single file ──
    const singleTypes = [
      { key: 'google', label: 'Google Ads', parser: 'GoogleAdsParser' },
      { key: 'kommo',  label: 'Kommo CRM',  parser: 'KommoParser'     },
    ];

    const singleSections = singleTypes.map(t => {
      const report = Storage.getReport(t.key);
      const statusHTML = report
        ? `<span class="report-status ok">✅ ${report.filename} · ${report.rowCount} filas · ${new Date(report.loadedAt).toLocaleDateString('es-AR')}</span>
           <button class="btn-sm danger" onclick="Admin.deleteReport('${t.key}')">Eliminar</button>`
        : `<span class="report-status empty">Sin datos</span>`;

      return `
        <div class="report-row">
          <div class="report-info">
            <span class="report-name">${t.label}</span>
            <div class="report-status-wrap">${statusHTML}</div>
          </div>
          <div class="report-actions">
            <input type="file" id="file-${t.key}" accept=".csv" style="display:none"
                   onchange="Admin.handleUpload('${t.key}', '${t.parser}', this)"/>
            <button class="btn-sm" onclick="document.getElementById('file-${t.key}').click()">
              📂 Subir CSV
            </button>
          </div>
        </div>`;
    }).join('');

    list.innerHTML = metaSection + singleSections;
  }

  // ── Wall tab ─────────────────────────────────────────────────────────────────
  function renderWallTab() {
    const container = document.getElementById('tab-wall');
    if (!container) return;
    const posts = Storage.getWallPosts();
    const list  = container.querySelector('.admin-wall-list');
    if (!list) return;

    if (!posts.length) {
      list.innerHTML = '<p class="empty-cell">No hay publicaciones todavía.</p>';
      return;
    }

    const sorted = [...posts].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    list.innerHTML = sorted.map(p => {
      const reactions = Object.values(p.reactions || {}).reduce((acc, arr) => acc + (arr?.length || 0), 0);
      return `
        <div class="admin-post-row">
          <div class="ap-meta">
            <span class="ap-author">${p.authorName}</span>
            <span class="ap-date">${new Date(p.timestamp).toLocaleDateString('es-AR')}</span>
            ${p.pinned ? '<span class="pin-badge-sm">📌</span>' : ''}
          </div>
          <div class="ap-text">${(p.text || '').slice(0, 100)}${(p.text?.length || 0) > 100 ? '…' : ''}</div>
          <div class="ap-actions">
            <span class="ap-stats">💬 ${(p.comments||[]).length} · ${reactions} reacciones</span>
            <button class="btn-sm" onclick="Admin.editPost('${p.id}')">✏️ Editar</button>
            <button class="btn-sm" onclick="Admin.pinPost('${p.id}')">${p.pinned ? '📍 Desfijar' : '📌 Fijar'}</button>
            <button class="btn-sm danger" onclick="Admin.deletePostAdmin('${p.id}')">🗑️</button>
          </div>
        </div>`;
    }).join('');
  }

  // ── Social tab ───────────────────────────────────────────────────────────────
  function renderSocialTab() {
    const container = document.getElementById('tab-social');
    if (!container) return;
    const socials = Storage.getSocialPreviews() || JSON.parse(JSON.stringify(SOCIAL_DEFAULTS));
    const list    = container.querySelector('.social-admin-list');
    if (!list) return;

    list.innerHTML = socials.map(s => `
      <div class="social-admin-row">
        <div class="social-admin-name">${s.name} <span class="u-last">${s.handle}</span></div>
        <div class="social-admin-fields">
          <div class="sad-field">
            <label>Texto</label>
            <input type="text" class="sad-input" id="sad-text-${s.id}" value="${(s.text||'').replace(/"/g,'&quot;')}"/>
          </div>
          <div class="sad-field">
            <label>Link perfil</label>
            <input type="text" class="sad-input" id="sad-link-${s.id}" value="${s.link||''}"/>
          </div>
          <div class="sad-field">
            <label>Fecha</label>
            <input type="text" class="sad-input" id="sad-date-${s.id}" value="${s.date||''}"/>
          </div>
        </div>
        <button class="btn-sm" onclick="Admin.saveSocial('${s.id}')">Guardar</button>
      </div>`).join('');
  }

  // ── Config tab ───────────────────────────────────────────────────────────────
  function renderConfigTab() {
    const container = document.getElementById('tab-config');
    if (!container) return;
    const el = container.querySelector('.config-display');
    if (!el) return;

    el.innerHTML = `
      <div class="config-section">
        <h4>Fuentes válidas de leads</h4>
        <div class="config-tags">${FIXY_CONFIG.allowedLeadSources.map(s => `<span class="cfg-tag">${s}</span>`).join('')}</div>
      </div>
      <div class="config-section">
        <h4>Keywords excluidas (Kommo)</h4>
        <div class="config-tags">${FIXY_CONFIG.excludedKeywords.map(s => `<span class="cfg-tag bad">${s}</span>`).join('')}</div>
      </div>
      <div class="config-section">
        <h4>Servicios válidos</h4>
        <div class="config-tags">${FIXY_CONFIG.validServices.map(s => `<span class="cfg-tag good">${s}</span>`).join('')}</div>
      </div>
      <div class="config-section">
        <h4>Estados: Ganado</h4>
        <div class="config-tags">${FIXY_CONFIG.wonStatuses.map(s => `<span class="cfg-tag good">${s}</span>`).join('')}</div>
      </div>
      <div class="config-section">
        <h4>Estados: En gestión</h4>
        <div class="config-tags">${FIXY_CONFIG.activeStatuses.map(s => `<span class="cfg-tag">${s}</span>`).join('')}</div>
      </div>`;
  }

  // ── Public API ───────────────────────────────────────────────────────────────
  return {
    init(user) {
      _user = user;
      this.switchTab('users');
    },

    switchTab(tab) {
      _activeTab = tab;
      document.querySelectorAll('.admin-tab').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.admin-nav-btn').forEach(btn => btn.classList.remove('active'));
      const tabEl  = document.getElementById('tab-' + tab);
      const navBtn = document.querySelector(`[data-tab="${tab}"]`);
      if (tabEl)  tabEl.classList.add('active');
      if (navBtn) navBtn.classList.add('active');
      this.renderTab(tab);
    },

    renderTab(tab) {
      switch (tab) {
        case 'users':   renderUsersTab();   break;
        case 'reports': renderReportsTab(); break;
        case 'wall':    renderWallTab();    break;
        case 'social':  renderSocialTab();  break;
        case 'config':  renderConfigTab();  break;
      }
    },

    // ── Users ──────────────────────────────────────────────────────────────────
    changeRole(email, newRole) {
      if (Auth.isAdmin(email)) return;
      Storage.upsertUser({ email, role: newRole });
    },

    toggleViewAsUser() {
      const current = Storage.getAdminViewAs();
      Storage.setAdminViewAs(!current);
      // sessionStorage persists across same-tab navigation, so index.html will read the flag
      window.location.href = 'index.html';
    },

    // ── Reports: Meta (multi-file) ─────────────────────────────────────────────
    handleUploadMeta(input) {
      const file = input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const report = MetaParser.parse(e.target.result, file.name);
          Storage.addReport('meta', report);
          Storage.addActivity({ text: 'Reporte Meta Ads: ' + file.name, time: 'Ahora', dot: 'y' });
          renderReportsTab();
        } catch (err) {
          alert('Error al procesar Meta Ads CSV: ' + err.message);
        }
      };
      reader.readAsText(file, 'UTF-8');
      input.value = '';
    },

    deleteMetaReport(id) {
      if (!confirm('¿Eliminar este archivo de Meta Ads?')) return;
      Storage.deleteReportById('meta', id);
      renderReportsTab();
    },

    // ── Reports: single file (Google, Kommo) ───────────────────────────────────
    handleUpload(type, parserName, input) {
      const file = input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const parser = window[parserName];
          if (!parser) throw new Error('Parser no disponible: ' + parserName);
          const report = parser.parse(e.target.result, file.name);
          Storage.saveReport(type, report);
          Storage.addActivity({ text: 'Reporte ' + type + ': ' + file.name, time: 'Ahora', dot: 'y' });
          renderReportsTab();
        } catch (err) {
          alert('Error al procesar el archivo: ' + err.message);
        }
      };
      reader.readAsText(file, 'UTF-8');
      input.value = '';
    },

    deleteReport(type) {
      if (!confirm('¿Eliminar el reporte de ' + type + '?')) return;
      Storage.deleteReport(type);
      renderReportsTab();
    },

    // ── Wall ───────────────────────────────────────────────────────────────────
    editPost(postId) {
      const posts = Storage.getWallPosts();
      const post  = posts.find(p => p.id === postId);
      if (!post) return;
      const newText = prompt('Editar publicación:', post.text);
      if (newText === null) return;
      post.text     = newText.trim() || post.text;
      post.editedAt = new Date().toISOString();
      Storage.saveWallPosts(posts);
      renderWallTab();
    },

    pinPost(postId) {
      const posts = Storage.getWallPosts();
      const post  = posts.find(p => p.id === postId);
      if (!post) return;
      post.pinned = !post.pinned;
      Storage.saveWallPosts(posts);
      renderWallTab();
    },

    deletePostAdmin(postId) {
      if (!confirm('¿Eliminar esta publicación?')) return;
      Storage.saveWallPosts(Storage.getWallPosts().filter(p => p.id !== postId));
      renderWallTab();
    },

    // ── Social ─────────────────────────────────────────────────────────────────
    saveSocial(id) {
      const socials = Storage.getSocialPreviews() || JSON.parse(JSON.stringify(SOCIAL_DEFAULTS));
      const s = socials.find(x => x.id === id);
      if (!s) return;
      s.text = document.getElementById('sad-text-' + id)?.value?.trim() || s.text;
      s.link = document.getElementById('sad-link-' + id)?.value?.trim() || s.link;
      s.date = document.getElementById('sad-date-' + id)?.value?.trim() || s.date;
      Storage.saveSocialPreviews(socials);
      const btn = document.querySelector(`[onclick="Admin.saveSocial('${id}')"]`);
      if (btn) { btn.textContent = '✅ Guardado'; setTimeout(() => btn.textContent = 'Guardar', 1500); }
    }
  };
})();
