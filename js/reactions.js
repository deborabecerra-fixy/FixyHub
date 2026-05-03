const Reactions = (() => {
  function getPostReactions(post) {
    if (!post.reactions) return {};
    return post.reactions;
  }

  function getUserReaction(post, userEmail) {
    const reactions = getPostReactions(post);
    for (const [key, emails] of Object.entries(reactions)) {
      if (Array.isArray(emails) && emails.includes(userEmail)) return key;
    }
    return null;
  }

  function setReaction(post, userEmail, reactionKey) {
    if (!post.reactions) post.reactions = {};
    // Remove user from all reaction arrays first
    for (const key of Object.keys(post.reactions)) {
      post.reactions[key] = (post.reactions[key] || []).filter(e => e !== userEmail);
    }
    // Add to new reaction (toggle if same)
    if (reactionKey) {
      if (!post.reactions[reactionKey]) post.reactions[reactionKey] = [];
      post.reactions[reactionKey].push(userEmail);
    }
    return post;
  }

  function countReactions(post) {
    const reactions = getPostReactions(post);
    let total = 0;
    const byType = {};
    for (const [key, emails] of Object.entries(reactions)) {
      const count = Array.isArray(emails) ? emails.length : 0;
      if (count > 0) byType[key] = count;
      total += count;
    }
    return { total, byType };
  }

  function renderReactionBar(post, userEmail, isAdmin, onReact) {
    const { total, byType } = countReactions(post);
    const userReaction = getUserReaction(post, userEmail);

    const btns = REACTION_TYPES.map(rt => {
      const count  = byType[rt.key] || 0;
      const active = userReaction === rt.key;
      return `
        <button class="reaction-btn${active ? ' active' : ''}"
                data-key="${rt.key}"
                title="${rt.label}"
                onclick="Reactions.handleClick(event,'${post.id}','${rt.key}')">
          <span class="r-emoji">${rt.emoji}</span>
          ${count > 0 ? `<span class="rc">${count}</span>` : ''}
        </button>`;
    }).join('');

    const totalDisplay = total > 0
      ? `<span class="rdisplay">${total} reacción${total !== 1 ? 'es' : ''}</span>`
      : '';

    return `<div class="post-reactions">${btns}${totalDisplay}</div>`;
  }

  return {
    getUserReaction,
    setReaction,
    countReactions,
    renderReactionBar,

    handleClick(event, postId, reactionKey) {
      event.stopPropagation();
      const user = Auth.getCurrentUser();
      if (!user) return;

      const posts = Storage.getWallPosts();
      const post = posts.find(p => p.id === postId);
      if (!post) return;

      const current = getUserReaction(post, user.email);
      // Toggle: clicking same reaction removes it
      const newKey = current === reactionKey ? null : reactionKey;
      setReaction(post, user.email, newKey);
      Storage.saveWallPosts(posts);

      // Re-render the post card to update reaction display
      if (typeof Wall !== 'undefined') Wall.renderPost(post, user);
    }
  };
})();
