const Analytics = (() => {
  function fmtCurrency(n) {
    if (!n) return '$0';
    if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return '$' + Math.round(n / 1000) + 'K';
    return '$' + n.toLocaleString('es-AR');
  }

  function fmtNum(n) {
    if (!n) return '0';
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return Math.round(n / 1000) + 'K';
    return String(n);
  }

  return {
    generateMarketingInsights(metaSummary, googleSummary, kommoSummary) {
      const alerts = [];
      const recommendations = [];
      let bestChannel = null;
      let executiveSummary = '';
      let leadQualityComment = '';
      const campaignsToReview = [];

      const hasMeta   = !!(metaSummary   && metaSummary.totalCampaigns   > 0);
      const hasGoogle = !!(googleSummary && googleSummary.totalSpend      > 0);
      const hasKommo  = !!(kommoSummary  && kommoSummary.totalImported    > 0);

      if (!hasMeta && !hasGoogle && !hasKommo) {
        return {
          executiveSummary: 'No hay datos cargados todavía.',
          alerts: [],
          recommendations: [],
          bestChannel: null,
          campaignsToReview: [],
          leadQualityComment: 'Subí los reportes desde el panel de Admin para ver métricas reales.'
        };
      }

      // ── Meta Ads insights ────────────────────────
      if (hasMeta) {
        const m = metaSummary;
        if (m.campaignsToReview?.length > 0) {
          alerts.push(`${m.campaignsToReview.length} campaña(s) de Meta están gastando sin resultados.`);
          campaignsToReview.push(...m.campaignsToReview.map(c => ({ source: 'Meta', name: c })));
        }
        if (m.activeCampaigns === 0 && m.totalCampaigns > 0) {
          alerts.push('Meta Ads: ninguna campaña activa en el reporte cargado.');
        }
        if (m.bestCampaign) {
          recommendations.push(`Mejor campaña Meta: "${m.bestCampaign}" — costo por resultado ${fmtCurrency(m.averageCostPerResult)}.`);
        }
      }

      // ── Google Ads insights ──────────────────────
      if (hasGoogle) {
        const g = googleSummary;
        if (g.problematicTerms?.length > 0) {
          alerts.push(`Google Ads: ${g.problematicTerms.length} términos de búsqueda no comerciales detectados.`);
          recommendations.push('Revisá los términos no comerciales en Google Ads y añadí palabras negativas.');
        }
        if (g.campaignsToReview?.length > 0) {
          alerts.push(`${g.campaignsToReview.length} campaña(s) de Google con gasto y sin conversiones.`);
          campaignsToReview.push(...g.campaignsToReview.map(c => ({ source: 'Google', name: c })));
        }
      }

      // ── Kommo insights ───────────────────────────
      if (hasKommo) {
        const k = kommoSummary;
        const rate = k.manageableRate || 0;
        const convRate = k.conversionRateOverManageable || 0;

        if (rate < 40) {
          alerts.push(`Solo el ${rate}% de los leads importados son gestionables. Muchos no califican.`);
          recommendations.push('Revisá las fuentes de tráfico: hay muchos leads fuera del segmento objetivo.');
        } else if (rate >= 70) {
          recommendations.push(`Excelente calidad: el ${rate}% de los leads son gestionables.`);
        }

        if (k.jobSearchLeads > 0) {
          alerts.push(`${k.jobSearchLeads} leads descartados por búsqueda laboral.`);
        }
        if (k.personalShippingLeads > 0) {
          alerts.push(`${k.personalShippingLeads} leads descartados por envío personal.`);
        }

        leadQualityComment = `De ${k.totalImported} leads importados, ${k.manageableLeads} son gestionables (${rate}%). ` +
          `Ganados: ${k.wonLeads}. Conversión sobre gestionables: ${convRate}%.`;

        if (convRate < 10 && k.manageableLeads > 10) {
          recommendations.push(`Conversión del ${convRate}% sobre gestionables. Evaluá el proceso de seguimiento en Kommo.`);
        }
      }

      // ── Best channel ─────────────────────────────
      if (hasMeta && hasGoogle) {
        const metaScore  = (metaSummary.totalResults  || 0) / Math.max(metaSummary.totalSpent  || 1, 1);
        const googleScore = (googleSummary.totalConversions || 0) / Math.max(googleSummary.totalSpend || 1, 1);
        bestChannel = metaScore >= googleScore ? 'Meta Ads' : 'Google Ads';
        recommendations.push(`Canal con mejor rendimiento actual: ${bestChannel}.`);
      } else if (hasMeta)   { bestChannel = 'Meta Ads'; }
      else if (hasGoogle)   { bestChannel = 'Google Ads'; }

      // ── Executive summary ────────────────────────
      const parts = [];
      if (hasMeta) {
        parts.push(`Meta Ads: ${metaSummary.activeCampaigns} campaña(s) activa(s), ${fmtCurrency(metaSummary.totalSpent)} invertidos, ${fmtNum(metaSummary.totalResults)} resultados.`);
      }
      if (hasGoogle) {
        parts.push(`Google Ads: ${fmtCurrency(googleSummary.totalSpend)} invertidos, ${googleSummary.totalConversions} conversiones.`);
      }
      if (hasKommo) {
        parts.push(`Kommo: ${kommoSummary.manageableLeads} leads gestionables de ${kommoSummary.totalImported} importados.`);
      }

      executiveSummary = parts.join(' / ');

      return {
        executiveSummary,
        alerts,
        recommendations,
        bestChannel,
        campaignsToReview,
        leadQualityComment
      };
    }
  };
})();
