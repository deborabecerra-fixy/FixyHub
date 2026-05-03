// ── Auth module ──────────────────────────────────────────────────────────────
// Firebase Auth when FIREBASE_CONFIGURED = true.
// Falls back to localStorage-only mode for local dev (any password accepted).
// ─────────────────────────────────────────────────────────────────────────────

const Auth = (() => {
  const ERROR_MAP = {
    'auth/user-not-found':        'Usuario no encontrado. Verificá el email.',
    'auth/wrong-password':        'Contraseña incorrecta.',
    'auth/invalid-email':         'Email inválido.',
    'auth/too-many-requests':     'Demasiados intentos. Esperá unos minutos.',
    'auth/user-disabled':         'Esta cuenta fue deshabilitada.',
    'auth/invalid-credential':    'Email o contraseña incorrectos.',
    'auth/network-request-failed':'Sin conexión. Revisá tu internet.',
    'auth/operation-not-allowed': 'Método de autenticación no habilitado.',
  };

  function mapError(code) {
    return ERROR_MAP[code] || 'Error inesperado. Intentá de nuevo.';
  }

  function getInitials(email) {
    const name  = email.split('@')[0];
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

  function buildUserProfile(email, existing) {
    const normalized = email.toLowerCase();
    const isAdmin    = normalized === FIXY_CONFIG.adminEmail.toLowerCase();
    return {
      email:    normalized,
      name:     existing?.name     || getDisplayName(normalized),
      initials: existing?.initials || getInitials(normalized),
      role:     isAdmin ? 'admin' : (existing?.role || 'viewer'),
      isAdmin,
      loginAt:  new Date().toISOString()
    };
  }

  function useFirebase() {
    return FIREBASE_CONFIGURED && typeof firebase !== 'undefined';
  }

  return {
    // ── Login ──────────────────────────────────────────────────────
    async login(email, password) {
      const normalized = email.trim().toLowerCase();
      const parts = normalized.split('@');
      if (parts.length !== 2 || parts[1] !== FIXY_CONFIG.allowedDomain) {
        return { ok: false, error: 'Solo se permiten cuentas @' + FIXY_CONFIG.allowedDomain };
      }

      if (useFirebase()) {
        try {
          await firebase.auth().signInWithEmailAndPassword(normalized, password);
          // onAuthStateChanged handles profile building from this point
          return { ok: true };
        } catch (err) {
          return { ok: false, error: mapError(err.code) };
        }
      }

      // Dev fallback: email-only, any password accepted
      if (!password && !normalized) return { ok: false, error: 'Ingresá tu email.' };
      const existing = Storage.getUsers().find(u => u.email === normalized);
      const user = buildUserProfile(normalized, existing);
      Storage.setCurrentUser(user);
      Storage.upsertUser(user);
      Storage.addActivity({ text: user.name + ' inició sesión', time: 'Ahora', dot: '' });
      return { ok: true, user };
    },

    // ── Password reset ─────────────────────────────────────────────
    async resetPassword(email) {
      const normalized = email.trim().toLowerCase();
      if (!normalized.endsWith('@' + FIXY_CONFIG.allowedDomain)) {
        return { ok: false, error: 'Solo se permiten cuentas @' + FIXY_CONFIG.allowedDomain };
      }
      if (!useFirebase()) {
        return { ok: false, error: 'La recuperación de contraseña requiere Firebase configurado. Contactá a la admin.' };
      }
      try {
        await firebase.auth().sendPasswordResetEmail(normalized);
        return { ok: true };
      } catch (err) {
        return { ok: false, error: mapError(err.code) };
      }
    },

    // ── Logout ─────────────────────────────────────────────────────
    async logout() {
      Storage.clearSession();
      if (useFirebase()) {
        try { await firebase.auth().signOut(); } catch (e) { /* ignore */ }
      }
      window.location.href = 'index.html';
    },

    // ── Current user (sync, from localStorage cache) ───────────────
    getCurrentUser() {
      return Storage.getCurrentUser();
    },

    // ── Auth state listener ────────────────────────────────────────
    // Calls callback({ authenticated: bool, user? }) once auth state resolves.
    listenAuthState(callback) {
      if (useFirebase()) {
        firebase.auth().onAuthStateChanged(fbUser => {
          if (fbUser) {
            const normalized = fbUser.email.toLowerCase();
            const stored     = Storage.getCurrentUser();

            if (stored && stored.email === normalized) {
              callback({ authenticated: true, user: stored });
            } else {
              // Rebuild profile (session resumed on another device / tab)
              const existing = Storage.getUsers().find(u => u.email === normalized);
              const user = buildUserProfile(normalized, existing);
              Storage.setCurrentUser(user);
              Storage.upsertUser(user);
              callback({ authenticated: true, user });
            }
          } else {
            Storage.clearSession();
            callback({ authenticated: false });
          }
        });
      } else {
        // Dev fallback: synchronous
        const user = Storage.getCurrentUser();
        callback(user ? { authenticated: true, user } : { authenticated: false });
      }
    },

    // ── Route guards ───────────────────────────────────────────────
    requireAuth() {
      const user = Storage.getCurrentUser();
      if (!user) { window.location.href = 'index.html'; return null; }
      return user;
    },

    requireAdmin() {
      const user = this.requireAuth();
      if (!user || !user.isAdmin) { window.location.href = 'index.html'; return null; }
      return user;
    },

    isAdmin(email) {
      return email?.toLowerCase() === FIXY_CONFIG.adminEmail.toLowerCase();
    }
  };
})();
