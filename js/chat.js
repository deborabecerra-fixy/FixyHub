const Chat = (() => {
  let _context = null;

  const GREETINGS = ['hola', 'buenas', 'buen día', 'hey', 'hi', 'qué tal', 'que tal'];

  function buildContext() {
    const meta   = Storage.getReport('meta')?.summary   || null;
    const google = Storage.getReport('google')?.summary || null;
    const kommo  = Storage.getReport('kommo')?.summary  || null;
    return { meta, google, kommo, hasData: !!(meta || google || kommo) };
  }

  function detectIntent(q) {
    const msg = q.toLowerCase().trim();

    if (GREETINGS.some(g => msg.includes(g))) return 'greeting';

    const checks = [
      { intent: 'best_campaign',    keys: ['mejor campaña', 'mejor campaign', 'top campaña', 'qué campaña'] },
      { intent: 'campaigns_review', keys: ['revisar', 'a revisar', 'sin resultado', 'gastando sin'] },
      { intent: 'meta_ads',         keys: ['meta', 'facebook', 'instagram ads', 'meta ads'] },
      { intent: 'google_ads',       keys: ['google', 'google ads', 'adwords'] },
      { intent: 'kommo',            keys: ['kommo', 'crm', 'leads', 'gestionables', 'pipeline'] },
      { intent: 'recommendations',  keys: ['recomend', 'qué hacemos', 'qué hago', 'consejo', 'mejora', 'próximos pasos'] },
      { intent: 'socials',          keys: ['redes', 'instagram', 'linkedin', 'tiktok', 'social'] },
      { intent: 'campaign_status',  keys: ['campaña', 'campañas', 'activas', 'estado'] },
      { intent: 'help',             keys: ['ayuda', 'help', 'qué podés', 'qué puedes', 'qué sabés'] },
    ];

    for (const { intent, keys } of checks) {
      if (keys.some(k => msg.includes(k))) return intent;
    }
    return 'unknown';
  }

  const PERSONALITY = [
    "Ahí te lo bajo simple:",
    "Che, te lo traduzco:",
    "Buena pregunta, te cuento:",
    "Mirá lo que tengo:",
    "Dato real:",
  ];

  function randPhrase() {
    return PERSONALITY[Math.floor(Math.random() * PERSONALITY.length)];
  }

  function noDataReply() {
    return `No lo sep 🤔\n\nY esta vez casi en serio: todavía no hay reportes cargados. Subí Meta, Google o Kommo desde Admin y te digo algo útil, no humo.`;
  }

  function answerWithData(intent, ctx) {
    const { meta, google, kommo } = ctx;

    function fmtC(n) {
      if (!n) return '$0';
      if (n >= 1000) return '$' + Math.round(n/1000) + 'K';
      return '$' + n;
    }

    switch (intent) {
      case 'greeting':
        return `¡Hola! Soy Flux. Tengo acceso a los datos que cargaron. Preguntame lo que quieras: campañas, leads, inversión, lo que sea.`;

      case 'campaign_status':
        if (!meta && !google) return noDataReply();
        {
          const parts = [];
          if (meta)   parts.push(`Meta: ${meta.activeCampaigns} activa(s) de ${meta.totalCampaigns} en el reporte.`);
          if (google) parts.push(`Google: ${google.activeCampaigns} activa(s).`);
          return `No lo sep 🤔\n\nNaa, mentira. ${randPhrase()}\n${parts.join(' ')}\n\n${meta?.campaignsToReview?.length ? `⚠️ Hay ${meta.campaignsToReview.length} campaña(s) gastando sin resultados — conviene revisarlas.` : 'Las campañas activas están corriendo sin alertas obvias.'}`;
        }

      case 'best_campaign':
        if (!meta) return noDataReply();
        return meta.bestCampaign
          ? `${randPhrase()}\nLa mejor campaña de Meta es **${meta.bestCampaign}** con costo por resultado de ${fmtC(meta.averageCostPerResult)}.`
          : `Por ahora no hay suficientes datos para elegir una campaña ganadora clara. Necesitamos resultados en el CSV.`;

      case 'campaigns_review':
        {
          const toReview = [
            ...(meta?.campaignsToReview || []).map(c => `Meta: ${c}`),
            ...(google?.campaignsToReview || []).map(c => `Google: ${c}`)
          ];
          if (!toReview.length) return `¡Buenas noticias! Ninguna campaña con gasto y sin resultados. Al menos por ahora.`;
          return `${randPhrase()}\nEstas campañas están gastando sin resultados:\n- ${toReview.slice(0,5).join('\n- ')}\n\nMi lectura: revisá la segmentación o pausalas hasta entender qué está pasando.`;
        }

      case 'meta_ads':
        if (!meta) return noDataReply();
        return `${randPhrase()}\nMeta Ads: invertiste ${fmtC(meta.totalSpent)}, tenés ${meta.totalResults} resultados con un costo promedio de ${fmtC(meta.averageCostPerResult)}. Impresiones: ${meta.totalImpressions >= 1000 ? Math.round(meta.totalImpressions/1000)+'K' : meta.totalImpressions}.`;

      case 'google_ads':
        if (!google) return noDataReply();
        {
          const probMsg = google.problematicTerms?.length
            ? `\n\n⚠️ Hay ${google.problematicTerms.length} términos no comerciales en las búsquedas — podrías estar tirando plata en tráfico que nunca va a convertir.`
            : '';
          return `${randPhrase()}\nGoogle Ads: ${fmtC(google.totalSpend)} invertidos, ${google.totalClicks} clics, ${google.totalConversions} conversiones (${fmtC(google.costPerConversion)} c/u).${probMsg}`;
        }

      case 'kommo':
        if (!kommo) return noDataReply();
        return `${randPhrase()}\nDe ${kommo.totalImported} leads importados, ${kommo.manageableLeads} son gestionables (${kommo.manageableRate}%). Ganados: ${kommo.wonLeads}. Conversión sobre gestionables: ${kommo.conversionRateOverManageable}%.\n\n${kommo.jobSearchLeads > 0 ? `Dato: ${kommo.jobSearchLeads} leads descartados por búsqueda laboral — no vale la pena seguirlos.` : ''}`;

      case 'recommendations': {
        const insights = Analytics.generateMarketingInsights(meta, google, kommo);
        if (!insights.recommendations.length) return noDataReply();
        return `${randPhrase()}\n${insights.recommendations.join('\n')}\n\n${insights.alerts.length ? '⚠️ Alertas: ' + insights.alerts.join(' / ') : ''}`;
      }

      case 'socials':
        return `Las redes las ves en el dashboard (cards de Instagram, LinkedIn, TikTok). Si querés actualizar un post, pedíselo a la admin.`;

      case 'help':
        return `Puedo contarte sobre:\n- Campañas activas y a revisar\n- Inversión y resultados de Meta Ads\n- Inversión y conversiones de Google Ads\n- Análisis de leads de Kommo\n- Recomendaciones cruzadas\n\nPreguntame directo, sin rodeos.`;

      default:
        return `Mmm, no entendí bien. Probá preguntarme sobre campañas, leads, Meta Ads, Google Ads o Kommo. Soy bueno con datos, no con adivinanzas. 😅`;
    }
  }

  function escHtml(str) {
    return (str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
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

    // Typing indicator
    const typing = document.createElement('div');
    typing.className = 'flux-msg-bot flux-typing';
    typing.textContent = '…';
    box.appendChild(typing);
    box.scrollTop = box.scrollHeight;

    setTimeout(() => {
      box.removeChild(typing);
      const intent  = detectIntent(q);
      const reply   = _context.hasData
        ? answerWithData(intent, _context)
        : (intent === 'greeting' ? answerWithData('greeting', _context) : noDataReply());
      appendMsg(box, reply, false);
    }, 600 + Math.random() * 400);
  }

  return {
    initSidebar(user) {
      _context = buildContext();
      const inp  = document.getElementById('flux-input');
      const send = document.querySelector('.flux-send');
      if (inp)  inp.addEventListener('keydown', e => { if (e.key === 'Enter') handleSend('flux-input', 'flux-msgs'); });
      if (send) send.addEventListener('click', () => handleSend('flux-input', 'flux-msgs'));
    },

    initFullPage(user) {
      _context = buildContext();
      const inp  = document.getElementById('chat-input');
      const send = document.getElementById('chat-send');
      if (inp) {
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') handleSend('chat-input', 'chat-messages'); });
      }
      if (send) send.addEventListener('click', () => handleSend('chat-input', 'chat-messages'));

      // Welcome message
      const box = document.getElementById('chat-messages');
      if (box) {
        appendMsg(box, '¡Hola! Soy Flux, el asistente de Marketing de Fixy. 👋\nTengo acceso a los datos cargados. Preguntame sobre campañas, leads, inversión o lo que necesites.', false);
      }
    },

    refreshContext() {
      _context = buildContext();
    }
  };
})();
