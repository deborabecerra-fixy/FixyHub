const Chat = (() => {
  let _context = null;

  const GREETINGS = ['hola', 'buenas', 'buen día', 'buenas tardes', 'buenas noches', 'hey', 'hi', 'qué tal', 'que tal', 'buen dia'];

  function buildContext() {
    const metaReports = Storage.getReports('meta');
    const meta   = metaReports.length ? consolidateMeta(metaReports) : null;
    const google = Storage.getReport('google')?.summary || null;
    const kommo  = Storage.getReport('kommo')?.summary  || null;
    return { meta, google, kommo, hasData: !!(meta || google || kommo) };
  }

  function consolidateMeta(reports) {
    if (!reports.length) return null;
    if (reports.length === 1) return reports[0].summary;
    const summaries = reports.map(r => r.summary);
    const totalSpent        = summaries.reduce((s, r) => s + (r.totalSpent        || 0), 0);
    const totalResults      = summaries.reduce((s, r) => s + (r.totalResults      || 0), 0);
    const totalImpressions  = summaries.reduce((s, r) => s + (r.totalImpressions  || 0), 0);
    const totalCampaigns    = summaries.reduce((s, r) => s + (r.totalCampaigns    || 0), 0);
    const activeCampaigns   = summaries.reduce((s, r) => s + (r.activeCampaigns   || 0), 0);
    const campaignsToReview = summaries.flatMap(r => r.campaignsToReview || []);
    const averageCostPerResult = totalResults > 0 ? Math.round(totalSpent / totalResults) : 0;
    let bestCampaign = null, bestCost = Infinity;
    for (const s of summaries) {
      if (s.bestCampaign && s.averageCostPerResult > 0 && s.averageCostPerResult < bestCost) {
        bestCampaign = s.bestCampaign; bestCost = s.averageCostPerResult;
      }
    }
    return { totalSpent, totalResults, totalImpressions, totalCampaigns, activeCampaigns, campaignsToReview, averageCostPerResult, bestCampaign };
  }

  // ── Intent detection ────────────────────────────────────────────────────
  function detectIntent(q) {
    const msg = q.toLowerCase().trim();

    if (GREETINGS.some(g => msg.includes(g))) return 'greeting';

    const checks = [
      // Emotional first — higher priority
      { intent: 'emotional_tired',     keys: ['cansada', 'cansado', 'no doy más', 'no doy mas', 'agotada', 'agotado', 'qué semana', 'que semana', 'estoy muerta', 'estoy muerto', 'reventada', 'sin energía'] },
      { intent: 'emotional_frustrated',keys: ['harta', 'harto', 'frustrada', 'frustrado', 'frustra', 'no funciona', 'me tiene', 'no entiendo', 'no sé qué hacer'] },
      { intent: 'emotional_stressed',  keys: ['estresada', 'estresado', 'estrés', 'estres', 'presión', 'presion', 'urgente', 'apurada', 'apurado', 'me ahogo'] },
      { intent: 'emotional_celebrate', keys: ['genial', 'funcionó', 'funciono', 'buena semana', 'cerramos', 'ganamos', 'logramos', 'salió bien', 'salio bien', '¡bien', '¡excelente'] },
      { intent: 'motivation',          keys: ['motivación', 'motivacion', 'motivame', 'motivarme', 'necesito un impulso', 'qué me decís', 'cómo sigo', 'para qué'] },
      { intent: 'knowledge_sales',     keys: ['cómo cerrar', 'como cerrar', 'ventas', 'pipeline', 'seguimiento'] },
      { intent: 'knowledge_marketing', keys: ['estrategia', 'creatividad', 'copy', 'contenido', 'brandeo'] },
      // Data intents
      { intent: 'best_campaign',       keys: ['mejor campaña', 'mejor campaign', 'top campaña', 'qué campaña', 'que campaña'] },
      { intent: 'campaigns_review',    keys: ['revisar', 'a revisar', 'sin resultado', 'gastando sin', 'pausar'] },
      { intent: 'meta_ads',            keys: ['meta', 'facebook ads', 'instagram ads', 'meta ads'] },
      { intent: 'google_ads',          keys: ['google', 'google ads', 'adwords'] },
      { intent: 'kommo',               keys: ['kommo', 'crm', 'leads', 'gestionables', 'pipeline'] },
      { intent: 'recommendations',     keys: ['recomend', 'qué hacemos', 'qué hago', 'consejo', 'mejora', 'próximos pasos', 'proximos pasos', 'qué haría'] },
      { intent: 'socials',             keys: ['redes', 'instagram', 'linkedin', 'tiktok', 'social'] },
      { intent: 'campaign_status',     keys: ['campaña', 'campañas', 'activas', 'estado'] },
      { intent: 'help',                keys: ['ayuda', 'help', 'qué podés', 'qué puedes', 'qué sabés', 'para qué servís'] },
    ];

    for (const { intent, keys } of checks) {
      if (keys.some(k => msg.includes(k))) return intent;
    }
    return 'unknown';
  }

  // ── Utilities ────────────────────────────────────────────────────────────
  const PERSONALITY = [
    "Ahí te lo bajo simple:",
    "Che, te lo traduzco:",
    "Buena pregunta, te cuento:",
    "Mirá lo que tengo:",
    "Dato real:",
  ];

  function rand(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function noDataReply() {
    return `No lo sé todavía — y esta vez va en serio: no hay reportes cargados.\n\nSubí el CSV de Meta, Google o Kommo desde el Panel Admin y te doy números reales, no humo.`;
  }

  function fmtC(n) {
    if (!n) return '$0';
    if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000)    return '$' + Math.round(n / 1000) + 'K';
    return '$' + n;
  }

  // ── Answer builder ───────────────────────────────────────────────────────
  function buildAnswer(intent, ctx) {
    const { meta, google, kommo } = ctx;
    const fk = typeof FluxKnowledge !== 'undefined' ? FluxKnowledge : null;

    switch (intent) {
      case 'greeting':
        return `¡Hola! Soy Flux.\n${ctx.hasData ? 'Tengo acceso a los reportes cargados. Preguntame lo que quieras: campañas, leads, inversión.' : 'Todavía no hay reportes cargados, pero igual podés preguntarme lo que quieras.'}`;

      // ── Emotional ──────────────────────────────────────────────────────
      case 'emotional_tired':
        return fk ? rand(fk.emotional.cansancio) : `Semana pesada. Pasará. ¿Qué necesitás resolver primero?`;

      case 'emotional_frustrated':
        return fk ? rand(fk.emotional.frustracion) : `La frustración dice que te importa. ¿Qué está trabando?`;

      case 'emotional_stressed':
        return fk ? rand(fk.emotional.stress) : `Un paso a la vez. ¿Qué es lo más urgente real hoy?`;

      case 'emotional_celebrate':
        return fk ? rand(fk.emotional.celebracion) : `¡Bien! Anotá qué funcionó para poder repetirlo. 🎉`;

      // ── Knowledge (no data needed) ─────────────────────────────────────
      case 'motivation':
        return fk ? rand(fk.motivacion) : `Seguís en pie midiendo cuando otros no miden. Eso ya es ventaja.`;

      case 'knowledge_sales':
        return fk ? rand(fk.ventas) : `Un lead sin seguimiento es plata que se cae sola.`;

      case 'knowledge_marketing':
        return fk ? rand(fk.marketing) : `Optimizar sin datos es adivinar. Con datos es trabajo real.`;

      // ── Data: campaigns ────────────────────────────────────────────────
      case 'campaign_status':
        if (!meta && !google) return noDataReply();
        {
          const parts = [];
          if (meta)   parts.push(`Meta: ${meta.activeCampaigns} activa(s) de ${meta.totalCampaigns} en el reporte.`);
          if (google) parts.push(`Google: ${google.activeCampaigns} activa(s).`);
          const alertMsg = meta?.campaignsToReview?.length
            ? `⚠️ ${meta.campaignsToReview.length} campaña(s) con gasto sin resultados — vale revisarlas.`
            : 'Las campañas activas corren sin alertas obvias.';
          return `${rand(PERSONALITY)}\n${parts.join(' ')}\n\n${alertMsg}`;
        }

      case 'best_campaign':
        if (!meta) return noDataReply();
        return meta.bestCampaign
          ? `${rand(PERSONALITY)}\nLa mejor campaña de Meta es **${meta.bestCampaign}** con costo por resultado de ${fmtC(meta.averageCostPerResult)}.`
          : `No hay suficientes datos para elegir una campaña ganadora clara todavía. Necesitamos resultados en el CSV.`;

      case 'campaigns_review': {
        const toReview = [
          ...(meta?.campaignsToReview  || []).map(c => `Meta: ${c}`),
          ...(google?.campaignsToReview || []).map(c => `Google: ${c}`)
        ];
        if (!toReview.length) return `¡Buenas noticias! Ninguna campaña con gasto y sin resultados visible. Al menos por ahora.`;
        return `${rand(PERSONALITY)}\nEstas campañas están gastando sin resultados:\n- ${toReview.slice(0, 5).join('\n- ')}\n\nMi lectura: revisá la segmentación o pausalas hasta entender qué está pasando.`;
      }

      case 'meta_ads':
        if (!meta) return noDataReply();
        return `${rand(PERSONALITY)}\nMeta Ads: invertiste ${fmtC(meta.totalSpent)}, ${meta.totalResults} resultados, costo promedio ${fmtC(meta.averageCostPerResult)}. Impresiones: ${meta.totalImpressions >= 1000 ? Math.round(meta.totalImpressions/1000)+'K' : meta.totalImpressions}.`;

      case 'google_ads':
        if (!google) return noDataReply();
        {
          const prob = google.problematicTerms?.length
            ? `\n\n⚠️ ${google.problematicTerms.length} término(s) no comerciales en las búsquedas — tráfico que no va a convertir.`
            : '';
          return `${rand(PERSONALITY)}\nGoogle Ads: ${fmtC(google.totalSpend)} invertidos, ${google.totalClicks} clics, ${google.totalConversions} conversiones (${fmtC(google.costPerConversion)} c/u).${prob}`;
        }

      case 'kommo':
        if (!kommo) return noDataReply();
        return `${rand(PERSONALITY)}\nDe ${kommo.totalImported} leads importados, ${kommo.manageableLeads} son gestionables (${kommo.manageableRate}%). Ganados: ${kommo.wonLeads}. Conversión: ${kommo.conversionRateOverManageable}%.${kommo.jobSearchLeads > 0 ? `\n\nDato: ${kommo.jobSearchLeads} leads descartados por búsqueda laboral.` : ''}`;

      case 'recommendations': {
        const insights = Analytics.generateMarketingInsights(meta, google, kommo);
        if (!insights.recommendations.length) return noDataReply();
        return `${rand(PERSONALITY)}\n${insights.recommendations.join('\n')}\n\n${insights.alerts.length ? '⚠️ Alertas: ' + insights.alerts.join(' / ') : ''}`;
      }

      case 'socials':
        return `Las redes las ves en el dashboard — cards de Instagram, LinkedIn, TikTok y YouTube. Para actualizar un post, pedíselo a la admin.`;

      case 'help':
        return `Puedo ayudarte con:\n- Campañas activas y a revisar\n- Inversión y resultados de Meta Ads\n- Google Ads: gasto, clics, conversiones\n- Análisis de leads de Kommo\n- Recomendaciones cruzadas\n- O simplemente escucharte si la semana pesó 😊\n\nPreguntame directo.`;

      default:
        return fk
          ? rand(fk.emotional.general)
          : `Mmm, no entendí bien. Probá preguntarme sobre campañas, leads, Meta, Google o Kommo. O contame qué está pasando.`;
    }
  }

  // ── DOM helpers ──────────────────────────────────────────────────────────
  function escHtml(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function formatBotText(text) {
    return escHtml(text)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }

  function appendMsg(container, text, isUser) {
    const div = document.createElement('div');
    div.className = isUser ? 'flux-msg-usr' : 'flux-msg-bot';
    div.innerHTML = isUser ? escHtml(text) : formatBotText(text);
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  function handleSend(inputId, containerId) {
    const inp = document.getElementById(inputId);
    const box = document.getElementById(containerId);
    if (!inp || !box) return;
    const q = inp.value.trim();
    if (!q) return;
    inp.value = '';

    appendMsg(box, q, true);
    _context = _context || buildContext();

    const typing = document.createElement('div');
    typing.className = 'flux-msg-bot flux-typing';
    typing.textContent = '…';
    box.appendChild(typing);
    box.scrollTop = box.scrollHeight;

    setTimeout(() => {
      box.removeChild(typing);
      const intent = detectIntent(q);
      const reply  = buildAnswer(intent, _context);
      appendMsg(box, reply, false);
    }, 500 + Math.random() * 500);
  }

  // ── Public API ───────────────────────────────────────────────────────────
  return {
    initSidebar(user) {
      _context = buildContext();
      const inp  = document.getElementById('flux-input');
      const send = document.querySelector('.flux-send');
      if (inp)  inp.addEventListener('keydown',  e => { if (e.key === 'Enter') handleSend('flux-input', 'flux-msgs'); });
      if (send) send.addEventListener('click', () => handleSend('flux-input', 'flux-msgs'));
    },

    initFullPage(user) {
      _context = buildContext();
      const inp  = document.getElementById('chat-input');
      const send = document.getElementById('chat-send');
      if (inp)  inp.addEventListener('keydown', e => { if (e.key === 'Enter') handleSend('chat-input', 'chat-messages'); });
      if (send) send.addEventListener('click', () => handleSend('chat-input', 'chat-messages'));

      const box = document.getElementById('chat-messages');
      if (box) {
        appendMsg(box, '¡Hola! Soy Flux, el asistente de Marketing de Fixy. 👋\nTengo acceso a los reportes cargados. Preguntame sobre campañas, leads, inversión — o simplemente contame cómo estuvo la semana.', false);
      }
    },

    sendChip(text) {
      const inputId = document.getElementById('chat-input') ? 'chat-input' : 'flux-input';
      const containerId = inputId === 'chat-input' ? 'chat-messages' : 'flux-msgs';
      const inp = document.getElementById(inputId);
      if (inp) { inp.value = text; handleSend(inputId, containerId); }
    },

    refreshContext() {
      _context = buildContext();
    }
  };
})();
