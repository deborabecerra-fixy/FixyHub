const Storage = (() => {
  const KEYS = {
    USER:       'fh_user',
    USERS:      'fh_users',
    WALL_POSTS: 'fh_wall_posts',
    SETTINGS:   'fh_settings',
    SOCIAL:     'fh_social',
    ACTIVITY:   'fh_activity',
  };

  const get = (key, def = null) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? def; }
    catch { return def; }
  };
  const set    = (key, val) => localStorage.setItem(key, JSON.stringify(val));
  const remove = (key)      => localStorage.removeItem(key);

  return {
    // ── Session ──────────────────────────────────────
    getCurrentUser: () => get(KEYS.USER),
    setCurrentUser: (user) => set(KEYS.USER, user),
    clearSession() {
      remove(KEYS.USER);
      sessionStorage.removeItem('fh_admin_view_as');
    },

    // ── Admin "view as user" — sessionStorage so it resets on tab close ──
    getAdminViewAs() {
      try { return JSON.parse(sessionStorage.getItem('fh_admin_view_as')) ?? false; }
      catch { return false; }
    },
    setAdminViewAs(val) {
      if (val) sessionStorage.setItem('fh_admin_view_as', JSON.stringify(val));
      else     sessionStorage.removeItem('fh_admin_view_as');
    },

    // ── Users ────────────────────────────────────────
    getUsers: () => get(KEYS.USERS, []),
    saveUsers: (users) => set(KEYS.USERS, users),
    upsertUser(user) {
      const users = get(KEYS.USERS, []);
      const idx   = users.findIndex(u => u.email === user.email);
      if (idx >= 0) users[idx] = { ...users[idx], ...user };
      else users.push(user);
      set(KEYS.USERS, users);
    },

    // ── Single reports (Google Ads, Kommo) ───────────
    getReport:    (type) => get('fh_report_' + type),
    saveReport:   (type, report) => set('fh_report_' + type, report),
    deleteReport: (type) => remove('fh_report_' + type),

    // ── Multi reports (Meta Ads — multiple CSVs) ─────
    getReports(type) {
      return get('fh_reports_' + type, []);
    },
    addReport(type, report) {
      const list = get('fh_reports_' + type, []);
      list.push({ ...report, id: report.id || 'r_' + Date.now() });
      set('fh_reports_' + type, list);
    },
    deleteReportById(type, id) {
      const list = get('fh_reports_' + type, []).filter(r => r.id !== id);
      set('fh_reports_' + type, list);
    },
    clearReports(type) {
      remove('fh_reports_' + type);
    },

    // ── Wall posts ───────────────────────────────────
    getWallPosts:  () => get(KEYS.WALL_POSTS, []),
    saveWallPosts: (posts) => set(KEYS.WALL_POSTS, posts),

    // ── Settings ─────────────────────────────────────
    getSettings:  () => get(KEYS.SETTINGS, {}),
    saveSettings: (s) => set(KEYS.SETTINGS, s),

    // ── Social previews ──────────────────────────────
    getSocialPreviews:  () => get(KEYS.SOCIAL),
    saveSocialPreviews: (data) => set(KEYS.SOCIAL, data),

    // ── Activity log ─────────────────────────────────
    getActivity: () => get(KEYS.ACTIVITY, []),
    addActivity(entry) {
      const list = get(KEYS.ACTIVITY, []);
      list.unshift({ ...entry, id: Date.now() });
      if (list.length > 30) list.length = 30;
      set(KEYS.ACTIVITY, list);
    },

    // ── Full reset ───────────────────────────────────
    resetAll() {
      Object.values(KEYS).forEach(k => remove(k));
      ['meta', 'google', 'kommo'].forEach(t => {
        remove('fh_report_'  + t);
        remove('fh_reports_' + t);
      });
      sessionStorage.removeItem('fh_admin_view_as');
    }
  };
})();
