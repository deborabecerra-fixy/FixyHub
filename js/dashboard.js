const Dashboard = (() => {
  function fmtCurrency(n) {
    if (!n) return '$0';
    if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000)    return '$' + Math.round(n / 1000) + 'K';
    return '$' + n.toLocaleString('es-AR');
  }

  function fmtNum(n) {
    if (!n) return '0';
    if (n >= 1000) return Math.round(n / 1000) + 'K';
    return String(n);
  }

  function safe(v) {
    return (v === undefined || v === null) ? 0 : v;
  }

  function emptyState(message) {
    return `<div class="dash-empty"><p>${message}</p></div>`;
  }

  // ── Consolidate multiple Meta CSV reports into one ────────────────────────
  function consolidateMetaReports(reports) {
    if (!reports || !reports.length) return null;
    if (reports.length === 1) return reports[0];

    const summaries = reports.map(r => r.summary);
    const totalSpent         = summaries.reduce((s, r) => s + (r.totalSpent         || 0), 0);
    const totalResults       = summaries.reduce((s, r) => s + (r.totalResults       || 0), 0);
    const totalImpressions   = summaries.reduce((s, r) => s + (r.totalImpressions   || 0), 0);
    const totalReach         = summaries.reduce((s, r) => s + (r.totalReach         || 0), 0);
    const totalCampaigns     = summaries.reduce((s, r) => s + (r.totalCampaigns     || 0), 0);
    const activeCampaigns    = summaries.reduce((s, r) => s + (r.activeCampaigns    || 0), 0);
    const campaignsToReview  = summaries.flatMap(r => r.campaignsToReview || []);
    const averageCostPerResult = totalResults > 0 ? Math.round(totalSpent / totalResults) : 0;

    // Best campaign: lowest cost-per-result across all files
    let bestCampaign      = null;
    let bestCostPerResult = Infinity;
    for (const s of summaries) {
      if (s.bestCampaign && s.averageCostPerResult > 0 && s.averageCostPerResult < bestCostPerResult) {
        bestCampaign      = s.bestCampaign;
        bestCostPerResult = s.averageCostPerResult;
      }
    }

    return {
      filename: reports.length + ' archivos consolidados',
      rowCount: reports.reduce((s, r) => s + (r.rowCount || 0), 0),
      loadedAt: reports[reports.length - 1].loadedAt,
      summary: {
        totalSpent, totalResults, totalImpressions, totalReach,
        totalCampaigns, activeCampaigns, campaignsToReview,
        averageCostPerResult, bestCampaign
      }
    };
  }

  // ── Stat cards ────────────────────────────────────────────────────────────
  function renderStats(meta, google, kommo) {
    const activeCamps = meta?.summary?.activeCampaigns ?? '—';
    const manLeads    = safe(kommo?.summary?.manageableLeads);
    const wonLeads    = safe(kommo?.summary?.wonLeads);

    const sc = document.getElementById('stat-camps');
    const sl = document.getElementById('stat-leads');
    const sw = document.getElementById('stat-won');
    if (sc) sc.textContent = activeCamps;
    if (sl) sl.textContent = manLeads;
    if (sw) sw.textContent = wonLeads;
  }

  // ── Meta Ads panel ────────────────────────────────────────────────────────
  function renderMetaPanel(report) {
    const body  = document.getElementById('meta-body');
    const badge = document.getElementById('meta-badge');
    if (!body) return;

    if (!report) {
      if (badge) badge.textContent = 'Sin datos';
      body.innerHTML = emptyState(
        'Todavía no hay reporte de Meta Ads cargado. Cuando subas el CSV desde Admin, acá vas a ver el resumen de campañas.'
      );
      return;
    }

    const s = report.summary;
    if (badge) badge.textContent = '✅ ' + s.totalCampaigns + ' campañas';

    const reviewHTML = s.campaignsToReview.length
      ? `<div class="dash-alert">⚠️ ${s.campaignsToReview.length} campaña(s) con gasto sin resultados: ${s.campaignsToReview.slice(0, 3).join(', ')}${s.campaignsToReview.length > 3 ? '…' : ''}</div>`
      : '';

    const filesNote = report.filename?.includes('archivos')
      ? `<p class="meta-note">📊 ${report.filename} · ${report.rowCount} filas</p>`
      : `<p class="meta-note">Reporte: ${report.filename} · ${report.rowCount} filas · ${new Date(report.loadedAt).toLocaleDateString('es-AR')}</p>`;

    body.innerHTML = `
      <div class="panel-inner">
        <div class="meta-summary">
          <div class="ms-card"><div class="ms-val">${fmtCurrency(s.totalSpent)}</div><div class="ms-lbl">Inversión</div></div>
          <div class="ms-card"><div class="ms-val">${s.activeCampaigns}</div><div class="ms-lbl">Activas</div></div>
          <div class="ms-card"><div class="ms-val">${fmtNum(s.totalResults)}</div><div class="ms-lbl">Resultados</div></div>
          <div class="ms-card"><div class="ms-val">${fmtCurrency(s.averageCostPerResult)}</div><div class="ms-lbl">Costo x resultado</div></div>
          <div class="ms-card"><div class="ms-val">${fmtNum(s.totalImpressions)}</div><div class="ms-lbl">Impresiones</div></div>
          <div class="ms-card"><div class="ms-val">${fmtNum(s.totalReach)}</div><div class="ms-lbl">Alcance</div></div>
        </div>
        ${reviewHTML}
        ${s.bestCampaign ? `<p class="meta-note">🏆 Mejor campaña: <strong>${s.bestCampaign}</strong></p>` : ''}
        ${filesNote}
      </div>`;
  }

  // ── Google Ads panel ──────────────────────────────────────────────────────
  function renderGooglePanel(report) {
    const body  = document.getElementById('google-body');
    const badge = document.getElementById('google-badge');
    if (!body) return;

    if (!report) {
      if (badge) badge.textContent = 'Sin datos';
      body.innerHTML = emptyState('Todavía no hay reporte de Google Ads. Subí el CSV desde Admin para ver el resumen.');
      return;
    }

    const s = report.summary;
    if (badge) badge.textContent = '✅ ' + s.activeCampaigns + ' campañas';

    const problemHTML = s.problematicTerms.length
      ? `<div class="dash-alert">⚠️ ${s.problematicTerms.length} término(s) no comerciales detectados.</div>`
      : '';

    body.innerHTML = `
      <div class="panel-inner">
        <div class="meta-summary">
          <div class="ms-card"><div class="ms-val">${fmtCurrency(s.totalSpend)}</div><div class="ms-lbl">Inversión</div></div>
          <div class="ms-card"><div class="ms-val">${s.activeCampaigns}</div><div class="ms-lbl">Activas</div></div>
          <div class="ms-card"><div class="ms-val">${fmtNum(s.totalClicks)}</div><div class="ms-lbl">Clics</div></div>
          <div class="ms-card"><div class="ms-val">${fmtNum(s.totalConversions)}</div><div class="ms-lbl">Conversiones</div></div>
          <div class="ms-card"><div class="ms-val">${fmtCurrency(s.costPerConversion)}</div><div class="ms-lbl">Costo x conv.</div></div>
          <div class="ms-card"><div class="ms-val">${fmtNum(s.totalImpressions)}</div><div class="ms-lbl">Impresiones</div></div>
        </div>
        ${problemHTML}
        <p class="meta-note">Reporte: ${report.filename} · ${report.rowCount} filas · ${new Date(report.loadedAt).toLocaleDateString('es-AR')}</p>
      </div>`;
  }

  // ── Kommo panel ───────────────────────────────────────────────────────────
  function renderKommoPanel(report) {
    const body  = document.getElementById('kommo-body');
    const badge = document.getElementById('kommo-badge');
    if (!body) return;

    if (!report) {
      if (badge) badge.textContent = 'Sin datos';
      body.innerHTML = emptyState('Todavía no hay reporte de Kommo. Subí el CSV desde Admin para ver el análisis de leads.');
      return;
    }

    const s = report.summary;
    const totalImp = safe(s.totalImported);
    const atribImp = safe(s.marketingAttributedLeads);
    const gestImp = safe(s.manageableLeads);
    const noGestImp = safe(s.nonManageableLeads);
    const wonImp = safe(s.wonLeads);
    const lostImp = safe(s.lostLeads);
    const activeImp = safe(s.activeLeads);
    const qualRate = safe(s.leadQualityRate);

    if (badge) badge.textContent = '✅ ' + totalImp + ' leads';

    // Descartados dentro de Marketing
    const discardedParts = [];
    if (safe(s.jobSearchLeads) > 0) discardedParts.push(`${s.jobSearchLeads} búsqueda laboral`);
    if (safe(s.personalShippingLeads) > 0) discardedParts.push(`${s.personalShippingLeads} envío particular`);
    if (safe(s.incompleteDataLeads) > 0) discardedParts.push(`${s.incompleteDataLeads} dato incompleto`);
    if (safe(s.outOfServiceLeads) > 0) discardedParts.push(`${s.outOfServiceLeads} fuera de servicio`);

    const qualityColor = qualRate >= 60 ? 'var(--green)' : qualRate >= 40 ? 'var(--yellow)' : 'var(--error)';

    body.innerHTML = `
      <div class="panel-inner">
        <div class="meta-summary">
          <div class="ms-card"><div class="ms-val">${totalImp}</div><div class="ms-lbl">Importados</div></div>
          <div class="ms-card"><div class="ms-val">${atribImp}</div><div class="ms-lbl">Atribuibles</div></div>
          <div class="ms-card"><div class="ms-val" style="color:${qualityColor}">${gestImp}</div><div class="ms-lbl">Gestionables</div></div>
          <div class="ms-card"><div class="ms-val">${noGestImp}</div><div class="ms-lbl">No gestionables</div></div>
          <div class="ms-card"><div class="ms-val">${wonImp}</div><div class="ms-lbl">Ganados*</div></div>
          <div class="ms-card"><div class="ms-val">${lostImp}</div><div class="ms-lbl">Perdidos*</div></div>
          <div class="ms-card"><div class="ms-val">${activeImp}</div><div class="ms-lbl">En gestión*</div></div>
          <div class="ms-card"><div class="ms-val" style="color:${qualityColor}">${qualRate}%</div><div class="ms-lbl">Calidad del lead</div></div>
        </div>
        ${discardedParts.length ? `<div class="dash-alert">📋 Descartados dentro de Marketing: ${discardedParts.join(' · ')}</div>` : ''}
        ${safe(s.excludedNotMarketing) > 0 ? `<div class="dash-alert">🚫 Fuera del análisis de Marketing: ${safe(s.excludedNotMarketing)}</div>` : ''}
        <p class="meta-note">* Contexto en Kommo CRM · ${report.filename} · ${new Date(report.loadedAt).toLocaleDateString('es-AR')}</p>
      </div>`;
  }

  // ── Insights panel ────────────────────────────────────────────────────────
  function renderInsights(insights) {
    const el = document.getElementById('insights-body');
    if (!el || !insights) return;

    if (!insights.executiveSummary || insights.executiveSummary === 'No hay datos cargados todavía.') {
      el.innerHTML = emptyState('Cargá al menos un reporte para ver el análisis cruzado.');
      return;
    }

    const alertsHTML = insights.alerts.map(a => `<div class="insight-alert">⚠️ ${a}</div>`).join('');
    const recsHTML   = insights.recommendations.map(r => `<div class="insight-rec">💡 ${r}</div>`).join('');

    el.innerHTML = `
      <div class="insight-summary">${insights.executiveSummary}</div>
      ${alertsHTML}
      ${recsHTML}
      ${insights.leadQualityComment ? `<div class="insight-leads">${insights.leadQualityComment}</div>` : ''}`;
  }

  // ── Activity log ──────────────────────────────────────────────────────────
  function renderActivity() {
    const list = document.getElementById('act-list');
    if (!list) return;
    const activity = Storage.getActivity();
    if (!activity.length) return;
    list.innerHTML = activity.slice(0, 5).map(a =>
      `<div class="act-item">
        <div class="act-dot ${a.dot || ''}"></div>
        <div><div class="act-text">${a.text}</div><div class="act-time">${a.time}</div></div>
      </div>`
    ).join('');
  }

  return {
    init(user) {
      const metaReports = Storage.getReports('meta');
      const meta        = consolidateMetaReports(metaReports);
      const google      = Storage.getReport('google');
      const kommo       = Storage.getReport('kommo');

      renderStats(meta, google, kommo);
      renderMetaPanel(meta);
      renderGooglePanel(google);
      renderKommoPanel(kommo);

      const insights = Analytics.generateMarketingInsights(
        meta?.summary   || null,
        google?.summary || null,
        kommo?.summary  || null
      );
      renderInsights(insights);
      renderActivity();
    },

    refresh() {
      this.init(Auth.getCurrentUser());
    }
  };
})();
