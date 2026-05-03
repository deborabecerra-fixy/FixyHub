const Dashboard = (() => {
  function fmtCurrency(n) {
    if (!n) return '$0';
    if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return '$' + Math.round(n / 1000) + 'K';
    return '$' + n.toLocaleString('es-AR');
  }

  function fmtNum(n) {
    if (!n) return '0';
    if (n >= 1000) return Math.round(n / 1000) + 'K';
    return String(n);
  }

  function emptyState(message) {
    return `<div class="dash-empty"><p>${message}</p></div>`;
  }

  function renderStats(meta, google, kommo) {
    const activeCamps  = meta?.summary.activeCampaigns   ?? '—';
    const manLeads     = kommo?.summary.manageableLeads   ?? '—';
    const wonLeads     = kommo?.summary.wonLeads          ?? '—';
    const totalSpent   = meta?.summary.totalSpent
      ? fmtCurrency(meta.summary.totalSpent)
      : (google?.summary.totalSpend ? fmtCurrency(google.summary.totalSpend) : '—');

    document.getElementById('stat-camps')?.setAttribute('data-val', activeCamps);
    document.getElementById('stat-leads')?.setAttribute('data-val', manLeads);
    document.getElementById('stat-won')?.setAttribute('data-val', wonLeads);

    const sc = document.getElementById('stat-camps');
    const sl = document.getElementById('stat-leads');
    const sw = document.getElementById('stat-won');
    if (sc) sc.textContent = activeCamps;
    if (sl) sl.textContent = manLeads;
    if (sw) sw.textContent = wonLeads;
  }

  function renderMetaPanel(report) {
    const body   = document.getElementById('meta-body');
    const badge  = document.getElementById('meta-badge');
    if (!body) return;

    if (!report) {
      badge && (badge.textContent = 'Sin datos');
      body.innerHTML = emptyState(
        'Todavía no hay reporte de Meta Ads cargado. Cuando Marketing suba el archivo CSV, acá vas a ver el resumen de campañas.'
      );
      return;
    }

    const s = report.summary;
    badge && (badge.textContent = '✅ ' + s.totalCampaigns + ' campañas');

    const reviewHTML = s.campaignsToReview.length
      ? `<div class="dash-alert">⚠️ ${s.campaignsToReview.length} campaña(s) con gasto sin resultados: ${s.campaignsToReview.slice(0,3).join(', ')}${s.campaignsToReview.length > 3 ? '…' : ''}</div>`
      : '';

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
        <p class="meta-note">Reporte: ${report.filename} · ${report.rowCount} filas · ${new Date(report.loadedAt).toLocaleDateString('es-AR')}</p>
      </div>`;
  }

  function renderGooglePanel(report) {
    const body  = document.getElementById('google-body');
    const badge = document.getElementById('google-badge');
    if (!body) return;

    if (!report) {
      badge && (badge.textContent = 'Sin datos');
      body.innerHTML = emptyState(
        'Todavía no hay reporte de Google Ads cargado. Subí el CSV desde Admin para ver el resumen.'
      );
      return;
    }

    const s = report.summary;
    badge && (badge.textContent = '✅ ' + s.activeCampaigns + ' campañas');

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

  function renderKommoPanel(report) {
    const body  = document.getElementById('kommo-body');
    const badge = document.getElementById('kommo-badge');
    if (!body) return;

    if (!report) {
      badge && (badge.textContent = 'Sin datos');
      body.innerHTML = emptyState(
        'Todavía no hay reporte de Kommo cargado. Subí el CSV desde Admin para ver el análisis de leads.'
      );
      return;
    }

    const s = report.summary;
    badge && (badge.textContent = '✅ ' + s.totalImported + ' leads');

    const excludedParts = [];
    if (s.jobSearchLeads      > 0) excludedParts.push(`${s.jobSearchLeads} búsqueda laboral`);
    if (s.personalShippingLeads > 0) excludedParts.push(`${s.personalShippingLeads} envío personal`);
    if (s.outOfSourceLeads    > 0) excludedParts.push(`${s.outOfSourceLeads} fuera de fuente`);
    if (s.incompleteDataLeads > 0) excludedParts.push(`${s.incompleteDataLeads} dato incompleto`);

    const rateColor = s.manageableRate >= 60 ? 'var(--green)' : s.manageableRate >= 40 ? 'var(--yellow)' : 'var(--error)';

    body.innerHTML = `
      <div class="panel-inner">
        <div class="meta-summary">
          <div class="ms-card"><div class="ms-val">${s.totalImported}</div><div class="ms-lbl">Importados</div></div>
          <div class="ms-card"><div class="ms-val" style="color:${rateColor}">${s.manageableLeads}</div><div class="ms-lbl">Gestionables</div></div>
          <div class="ms-card"><div class="ms-val">${s.wonLeads}</div><div class="ms-lbl">Ganados</div></div>
          <div class="ms-card"><div class="ms-val">${s.lostLeads}</div><div class="ms-lbl">Perdidos</div></div>
          <div class="ms-card"><div class="ms-val">${s.activeLeads}</div><div class="ms-lbl">En gestión</div></div>
          <div class="ms-card"><div class="ms-val">${s.conversionRateOverManageable}%</div><div class="ms-lbl">Conversión</div></div>
        </div>
        ${excludedParts.length
          ? `<div class="dash-alert">📋 Descartados: ${excludedParts.join(' · ')}</div>`
          : ''}
        <p class="meta-note">Tasa gestionable: <strong>${s.manageableRate}%</strong> · Reporte: ${report.filename} · ${new Date(report.loadedAt).toLocaleDateString('es-AR')}</p>
      </div>`;
  }

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
      const meta   = Storage.getReport('meta');
      const google = Storage.getReport('google');
      const kommo  = Storage.getReport('kommo');

      renderStats(meta, google, kommo);
      renderMetaPanel(meta);
      renderGooglePanel(google);
      renderKommoPanel(kommo);

      const metaS   = meta?.summary   || null;
      const googleS = google?.summary || null;
      const kommoS  = kommo?.summary  || null;
      const insights = Analytics.generateMarketingInsights(metaS, googleS, kommoS);
      renderInsights(insights);
      renderActivity();
    },

    refresh() {
      this.init(Auth.getCurrentUser());
    }
  };
})();
