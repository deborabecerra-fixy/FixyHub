const SocialPreview = (() => {
  let _user = null;
  let _editRedId = null;

  function getSocials() {
    return Storage.getSocialPreviews() || JSON.parse(JSON.stringify(SOCIAL_DEFAULTS));
  }

  function renderCard(r, isAdmin) {
    const editBtn = isAdmin
      ? `<button class="red-edit-btn" onclick="event.stopPropagation();SocialPreview.openEdit('${r.id}')">✏️</button>`
      : '';
    return `
      <div class="red-card" onclick="SocialPreview.openLink('${r.link}')">
        <div class="red-top">
          <div class="red-icon ${r.cls}">${r.icon}</div>
          <div>
            <div class="red-name">${r.name}</div>
            <div class="red-handle">${r.handle}</div>
          </div>
          ${editBtn}
        </div>
        <div class="red-body">
          <div class="red-last">${r.text}</div>
          <div class="red-date">${r.date}</div>
          <div class="red-link">
            <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/>
            </svg>
            Ver perfil
          </div>
        </div>
      </div>`;
  }

  function renderAll() {
    const grid = document.getElementById('redes-grid');
    if (!grid) return;
    const socials = getSocials();
    const isAdmin = Permissions.canViewAdminControls(_user) && !Storage.getAdminViewAs();
    grid.innerHTML = socials.map(r => renderCard(r, isAdmin)).join('');
  }

  return {
    init(user) {
      _user = user;
      renderAll();
    },

    openLink(url) {
      if (url && url.startsWith('http')) window.open(url, '_blank');
    },

    openEdit(id) {
      _editRedId = id;
      const socials = getSocials();
      const r = socials.find(x => x.id === id);
      if (!r) return;
      document.getElementById('rmt-title').textContent = '✏️ Editar ' + r.name;
      document.getElementById('rmt-text').value = r.text;
      document.getElementById('rmt-link').value = r.link;
      document.getElementById('rmt-date').value = r.date;
      document.getElementById('red-modal').classList.add('open');
    },

    closeEdit() {
      document.getElementById('red-modal').classList.remove('open');
      _editRedId = null;
    },

    save() {
      const socials = getSocials();
      const idx = socials.findIndex(x => x.id === _editRedId);
      if (idx === -1) return;
      socials[idx].text = document.getElementById('rmt-text').value.trim() || socials[idx].text;
      socials[idx].link = document.getElementById('rmt-link').value.trim() || socials[idx].link;
      socials[idx].date = document.getElementById('rmt-date').value.trim() || socials[idx].date;
      Storage.saveSocialPreviews(socials);
      renderAll();
      this.closeEdit();
    },

    // Called from admin panel to refresh
    refresh() { renderAll(); }
  };
})();
