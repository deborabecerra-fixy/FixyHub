const Wall = (() => {
  let _user = null;
  let _editingPostId = null;

  function timeLabel(iso) {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Ahora';
    if (diffMin < 60) return 'Hace ' + diffMin + ' min';
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return 'Hace ' + diffH + 'h';
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return dias[d.getDay()] + ' ' + d.getDate() + '/' + (d.getMonth() + 1);
  }

  function escHtml(str) {
    return (str || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function adminControls(post) {
    const isAdmin = Permissions.canDeletePost(_user, post);
    if (!isAdmin) return '';
    const pinLabel = post.pinned ? '📌 Fijar' : '📌 Destacar';
    return `
      <div class="post-admin-controls">
        <button class="post-ctrl-btn" onclick="Wall.openEdit('${post.id}')" title="Editar">✏️</button>
        <button class="post-ctrl-btn" onclick="Wall.togglePin('${post.id}')" title="Fijar/Desfijar">${post.pinned ? '📍' : '📌'}</button>
        <button class="post-ctrl-btn danger" onclick="Wall.deletePost('${post.id}')" title="Eliminar">🗑️</button>
      </div>`;
  }

  function buildPostHTML(post) {
    const isAdminPost = post.isAdmin;
    const avatarClass = isAdminPost ? 'post-avatar admin-av' : 'post-avatar';
    const crownHTML = isAdminPost ? '<span class="crown">👑</span>' : '';
    const pinBadge = post.pinned ? '<span class="pin-badge">📌 Destacado</span>' : '';
    const imgHTML = post.img
      ? `<div class="post-img"><img src="${escHtml(post.img)}" alt="" loading="lazy" onerror="this.parentElement.style.display='none'"/></div>`
      : '';

    const reactBar = Reactions.renderReactionBar(post, _user?.email, _user?.isAdmin, null);
    const cmtList  = Comments.renderCommentList(post.comments || []);
    const cmtInput = _user ? Comments.renderCommentInput(post.id, _user) : '';

    return `
      <div class="post-card${post.pinned ? ' pinned' : ''}" data-post-id="${post.id}">
        ${pinBadge}
        <div class="post-header">
          <div class="${avatarClass}">
            <span>${escHtml(post.authorInitials)}</span>${crownHTML}
          </div>
          <div class="post-meta">
            <div class="post-author">${escHtml(post.authorName)}</div>
            <div class="post-time">${timeLabel(post.timestamp)}</div>
          </div>
          ${adminControls(post)}
        </div>
        <div class="post-body">
          <div class="post-text">${escHtml(post.text)}</div>
          ${imgHTML}
        </div>
        ${reactBar}
        <div class="post-comments">
          <div class="clist" id="clist-${post.id}">${cmtList}</div>
          ${cmtInput}
        </div>
      </div>`;
  }

  function renderAll() {
    const container = document.getElementById('wall-container');
    if (!container) return;

    const posts = Storage.getWallPosts();
    if (!posts.length) {
      const canPost = Permissions.canPostWall(_user);
      container.innerHTML = `
        <div class="wall-empty">
          <p>Todavía no hay publicaciones en el muro.</p>
          ${canPost ? `<button class="btn-sm" onclick="Wall.openNew()">+ Crear primera publicación</button>` : ''}
        </div>`;
      return;
    }

    // Pinned first, then by date desc
    const sorted = [...posts].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    container.innerHTML = sorted.map(buildPostHTML).join('');
  }

  return {
    init(user) {
      _user = user;
      renderAll();
    },

    renderPost(post, user) {
      _user = user || _user;
      const el = document.querySelector(`[data-post-id="${post.id}"]`);
      if (el) el.outerHTML = buildPostHTML(post);
    },

    openNew() {
      if (!Permissions.canPostWall(_user)) return;
      _editingPostId = null;
      document.getElementById('post-modal-title').textContent = '✏️ Nueva publicación';
      document.getElementById('mpt').value = '';
      document.getElementById('mpi').value = '';
      document.getElementById('post-modal').classList.add('open');
    },

    openEdit(postId) {
      const posts = Storage.getWallPosts();
      const post  = posts.find(p => p.id === postId);
      if (!post || !Permissions.canEditPost(_user, post)) return;
      _editingPostId = postId;
      document.getElementById('post-modal-title').textContent = '✏️ Editar publicación';
      document.getElementById('mpt').value = post.text || '';
      document.getElementById('mpi').value = post.img  || '';
      document.getElementById('post-modal').classList.add('open');
    },

    closeModal() {
      document.getElementById('post-modal').classList.remove('open');
      _editingPostId = null;
    },

    savePost() {
      const text = document.getElementById('mpt').value.trim();
      const img  = document.getElementById('mpi').value.trim();
      if (!text) return;

      const posts = Storage.getWallPosts();

      if (_editingPostId) {
        const post = posts.find(p => p.id === _editingPostId);
        if (post) { post.text = text; post.img = img; post.editedAt = new Date().toISOString(); }
      } else {
        const newPost = {
          id: 'post_' + Date.now(),
          text, img,
          authorEmail:    _user.email,
          authorName:     _user.name,
          authorInitials: _user.initials,
          isAdmin:        _user.isAdmin,
          timestamp:      new Date().toISOString(),
          pinned: false,
          reactions: {},
          comments: []
        };
        posts.push(newPost);
        Storage.addActivity({ text: _user.name + ' publicó en el muro', time: 'Ahora', dot: 'y' });
      }

      Storage.saveWallPosts(posts);
      this.closeModal();
      renderAll();
    },

    deletePost(postId) {
      const posts = Storage.getWallPosts();
      const post  = posts.find(p => p.id === postId);
      if (!post || !Permissions.canDeletePost(_user, post)) return;
      if (!confirm('¿Eliminar esta publicación?')) return;
      const filtered = posts.filter(p => p.id !== postId);
      Storage.saveWallPosts(filtered);
      renderAll();
    },

    togglePin(postId) {
      if (!_user?.isAdmin) return;
      const posts = Storage.getWallPosts();
      const post  = posts.find(p => p.id === postId);
      if (!post) return;
      post.pinned = !post.pinned;
      Storage.saveWallPosts(posts);
      renderAll();
    }
  };
})();
