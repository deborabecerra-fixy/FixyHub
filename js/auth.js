const Auth = (() => {
  function getInitials(email) {
    const name = email.split('@')[0];
    const parts = name.split(/[._-]/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }

  function getDisplayName(email) {
    const name = email.split('@')[0];
    return name.split(/[._-]/)
      .map(p => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');
  }

  return {
    login(email) {
      const normalized = email.trim().toLowerCase();
      const parts = normalized.split('@');
      if (parts.length !== 2 || parts[1] !== FIXY_CONFIG.allowedDomain) {
        return { ok: false, error: 'Solo se permiten cuentas @' + FIXY_CONFIG.allowedDomain };
      }

      const isAdmin = normalized === FIXY_CONFIG.adminEmail.toLowerCase();
      const storedUsers = Storage.getUsers();
      const existing = storedUsers.find(u => u.email === normalized);
      const role = isAdmin ? 'admin' : (existing?.role || 'viewer');

      const user = {
        email: normalized,
        name: getDisplayName(email),
        initials: getInitials(email),
        role,
        isAdmin,
        loginAt: new Date().toISOString()
      };

      Storage.setCurrentUser(user);
      Storage.upsertUser(user);
      Storage.addActivity({ text: user.name + ' inició sesión', time: 'Ahora', dot: '' });
      return { ok: true, user };
    },

    logout() {
      Storage.clearSession();
      window.location.href = 'index.html';
    },

    getCurrentUser() {
      return Storage.getCurrentUser();
    },

    requireAuth() {
      const user = Storage.getCurrentUser();
      if (!user) {
        window.location.href = 'index.html';
        return null;
      }
      return user;
    },

    requireAdmin() {
      const user = this.requireAuth();
      if (!user) return null;
      if (!user.isAdmin) {
        window.location.href = 'index.html';
        return null;
      }
      return user;
    },

    isAdmin(email) {
      return email?.toLowerCase() === FIXY_CONFIG.adminEmail.toLowerCase();
    }
  };
})();
