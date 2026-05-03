const Permissions = (() => {
  function getEffectiveRole(user) {
    if (!user) return null;
    if (Auth.isAdmin(user.email)) return 'admin';
    const stored = Storage.getUsers().find(u => u.email === user.email);
    return stored?.role || 'viewer';
  }

  return {
    getUserRole(email) {
      if (!email) return null;
      if (Auth.isAdmin(email)) return 'admin';
      const stored = Storage.getUsers().find(u => u.email === email);
      return stored?.role || 'viewer';
    },

    canAccessAdmin(user) {
      return getEffectiveRole(user) === 'admin';
    },

    canPostWall(user) {
      return ['admin', 'editor'].includes(getEffectiveRole(user));
    },

    canUploadReports(user) {
      return getEffectiveRole(user) === 'admin';
    },

    canEditPost(user, post) {
      if (!user || !post) return false;
      const role = getEffectiveRole(user);
      if (role === 'admin') return true;
      return post.authorEmail === user.email;
    },

    canDeletePost(user, post) {
      if (!user || !post) return false;
      const role = getEffectiveRole(user);
      if (role === 'admin') return true;
      return post.authorEmail === user.email;
    },

    canViewAdminControls(user) {
      return getEffectiveRole(user) === 'admin';
    },

    canManageUsers(user) {
      return getEffectiveRole(user) === 'admin';
    },

    canComment(user) {
      return !!user;
    },

    canReact(user) {
      return !!user;
    }
  };
})();
