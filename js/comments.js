const Comments = (() => {
  function timeLabel(isoString) {
    const d = new Date(isoString);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Ahora';
    if (diffMin < 60) return 'Hace ' + diffMin + ' min';
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return 'Hace ' + diffH + 'h';
    return d.getDate() + '/' + (d.getMonth() + 1);
  }

  function renderCommentList(comments) {
    if (!comments || !comments.length) return '';
    return comments.map(c => `
      <div class="comment-item" data-cmt-id="${c.id}">
        <div class="cav-r">${c.authorInitials}</div>
        <div class="cbubble">
          <div class="cauth">${escapeHtml(c.authorName)}</div>
          <div class="ctxt">${escapeHtml(c.text)}</div>
          <div class="ctime">${timeLabel(c.timestamp)}</div>
        </div>
      </div>`).join('');
  }

  function escapeHtml(str) {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderCommentInput(postId, user) {
    return `
      <div class="cinput-row">
        <div class="cav-sm">${user.initials}</div>
        <input class="cinput" type="text"
               placeholder="Escribí un comentario…"
               id="cinput-${postId}"
               onkeydown="if(event.key==='Enter')Comments.add('${postId}')"/>
        <button class="csend" onclick="Comments.add('${postId}')">
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"/>
          </svg>
        </button>
      </div>`;
  }

  return {
    renderCommentList,
    renderCommentInput,

    add(postId) {
      const user = Auth.getCurrentUser();
      if (!user) return;
      const inp = document.getElementById('cinput-' + postId);
      if (!inp) return;
      const text = inp.value.trim();
      if (!text) return;

      const posts = Storage.getWallPosts();
      const post  = posts.find(p => p.id === postId);
      if (!post) return;
      if (!post.comments) post.comments = [];

      const comment = {
        id: 'cmt_' + Date.now(),
        authorEmail: user.email,
        authorName: user.name,
        authorInitials: user.initials,
        text,
        timestamp: new Date().toISOString()
      };
      post.comments.push(comment);
      Storage.saveWallPosts(posts);

      inp.value = '';

      // Append new comment to list without full re-render
      const clist = document.getElementById('clist-' + postId);
      if (clist) {
        clist.insertAdjacentHTML('beforeend', renderCommentList([comment]));
        clist.scrollTop = clist.scrollHeight;
      }
    }
  };
})();
