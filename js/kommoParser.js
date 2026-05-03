const KommoParser = (() => {
  const DEBUG_KOMMO = false;

  function norm(val) {
    return (val || '').toLowerCase().trim();
  }

  function normalizeText(val) {
    return (val || '')
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');
  }

  function normalizePhone(val) {
    return (val || '').replace(/[\D]/g, '');
  }

  function detectSep(line) {
    return line.includes(';') ? ';' : ',';
  }

  function splitLine(line, sep) {
    const result = [];
    let cur = '', inQ = false;
    for (const ch of line) {
      if (ch === '"') inQ = !inQ;
      else if (ch === sep && !inQ) { result.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    result.push(cur.trim());
    return result;
  }

  function findCol(headers, candidates) {
    const h = headers.map(x => x.toLowerCase());
    for (const c of candidates) {
      const idx = h.findIndex(x => x.includes(c));
      if (idx >= 0) return headers[idx];
    }
    return null;
  }

  function isJobSearch(row, headers) {
    const jobKeywords = ['trabajo', 'empleo', 'cv', 'curriculum', 'repartidor', 'mensajero', 'chofer', 'moto', 'quiero trabajar', 'busco trabajo', 'postularme'];
    const allText = headers.map(h => normalizeText(row[h])).join(' ');
    return jobKeywords.some(kw => allText.includes(kw));
  }

  function isPersonalShipping(row, headers) {
    const shipKeywords = ['envio particular', 'envío particular', 'paquete personal', 'mandar paquete', 'enviar paquete', 'precio envio', 'precio envío', 'encomienda particular', 'correo argentino'];
    const allText = headers.map(h => normalizeText(row[h])).join(' ');
    return shipKeywords.some(kw => allText.includes(kw));
  }

  function isMarketingAttribued(row, colMap) {
    const hasUtmSource = !!(row[colMap.utm_source] && norm(row[colMap.utm_source]).length > 0);
    const hasUtmMedium = !!(row[colMap.utm_medium] && norm(row[colMap.utm_medium]).length > 0);
    const hasUtmCampaign = !!(row[colMap.utm_campaign] && norm(row[colMap.utm_campaign]).length > 0);
    const hasUtmContent = !!(row[colMap.utm_content] && norm(row[colMap.utm_content]).length > 0);
    const hasUtmTerm = !!(row[colMap.utm_term] && norm(row[colMap.utm_term]).length > 0);
    const hasFbclid = !!(row[colMap.fbclid] && norm(row[colMap.fbclid]).length > 0);
    const hasGclid = !!(row[colMap.gclid] && norm(row[colMap.gclid]).length > 0);
    const hasGaUtm = !!(row[colMap.ga_utm] && norm(row[colMap.ga_utm]).length > 0);

    const utm = hasUtmSource || hasUtmMedium || hasUtmCampaign || hasUtmContent || hasUtmTerm;
    const clicks = hasFbclid || hasGclid;
    const analytics = hasGaUtm;

    if (utm || clicks || analytics) return true;

    // Check referrer
    if (row[colMap.referrer] && colMap.referrer) {
      const ref = normalizeText(row[colMap.referrer]);
      const marketingSources = ['google', 'facebook', 'instagram', 'meta', 'ads', 'fixy', 'tiktok', 'linkedin'];
      if (marketingSources.some(s => ref.includes(s))) return true;
    }

    // Check if any field contains marketing indicators
    if (colMap.solution || colMap.tags || colMap.notes || colMap.name) {
      const allText = [
        colMap.solution ? normalizeText(row[colMap.solution] || '') : '',
        colMap.tags ? normalizeText(row[colMap.tags] || '') : '',
        colMap.notes ? normalizeText(row[colMap.notes] || '') : '',
        colMap.name ? normalizeText(row[colMap.name] || '') : ''
      ].join(' ');
      const marketingIndicators = ['facebook', 'instagram', 'google', 'meta', 'ads', 'campana', 'campaña', 'publicidad', 'marketing'];
      if (marketingIndicators.some(ind => allText.includes(ind))) return true;
    }

    // Check allowed phones
    if (colMap.phone || colMap.phone2 || colMap.phone3 || colMap.phone4) {
      const allowedPhones = (FIXY_CONFIG?.allowedPhones || [])
        .filter(p => !p.startsWith('COMPLETAR'))
        .map(p => normalizePhone(p));
      
      const phonesCombined = [
        colMap.phone ? normalizePhone(row[colMap.phone] || '') : '',
        colMap.phone2 ? normalizePhone(row[colMap.phone2] || '') : '',
        colMap.phone3 ? normalizePhone(row[colMap.phone3] || '') : '',
        colMap.phone4 ? normalizePhone(row[colMap.phone4] || '') : ''
      ].join('');
      
      if (phonesCombined && allowedPhones.length > 0 && allowedPhones.some(p => p && phonesCombined.includes(p))) return true;
    }

    return false;
  }

  function classifyStatus(status) {
    const s = normalizeText(status);

    // Lost statuses
    const lostKeywords = ['perdido', 'lost', 'cerrado perdido', 'descartado', 'no califica', 'no responde', 'sin respuesta', 'no avanza'];
    if (lostKeywords.some(k => s.includes(k))) return 'lost';

    // Won statuses
    const wonKeywords = ['logrado', 'ganado', 'won', 'exito', 'éxito'];
    if (wonKeywords.some(k => s.includes(k))) return 'won';

    // Active statuses
    const activeKeywords = ['incoming', 'nuevo', 'contactado', 'seguimiento', 'esperando', 'feedback', 'negociacion', 'negociación', 'implementacion', 'implementación', 'en gestion', 'en gestión'];
    if (activeKeywords.some(k => s.includes(k))) return 'active';

    return 'other';
  }

  return {
    parse(csvText, filename) {
      const lines = csvText.trim().split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) throw new Error('Archivo vacío.');

      const sep = detectSep(lines[0]);
      const headers = splitLine(lines[0], sep).map(h => h.replace(/^"|"$/g, '').trim());
      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        const vals = splitLine(lines[i], sep).map(v => v.replace(/^"|"$/g, '').trim());
        if (vals.every(v => !v)) continue;
        const row = {};
        headers.forEach((h, j) => { row[h] = vals[j] || ''; });
        rows.push(row);
      }

      const colMap = {
        id:            findCol(headers, ['id']),
        name:          findCol(headers, ['nombre del lead', 'nombre']),
        status:        findCol(headers, ['estatus del lead', 'status', 'estatus']),
        pipeline:      findCol(headers, ['embudo', 'pipeline']),
        created:       findCol(headers, ['fecha de creacion', 'fecha de creación', 'created']),
        closed:        findCol(headers, ['cerrado', 'closed']),
        tags:          findCol(headers, ['etiquetas', 'tags']),
        notes:         findCol(headers, ['nota', 'note', 'nota 1', 'nota 2', 'nota 3', 'nota 4', 'nota 5']),
        solution:      findCol(headers, ['que solucion', 'qué solución', 'solucion', 'solución', 'solution']),
        shipments:     findCol(headers, ['cuantos envios', 'cuántos envíos', 'cant de envios', 'envios', 'envíos']),
        phone:         findCol(headers, ['phone', 'telefono', 'teléfono', 'celular', 'telefono celular']),
        phone2:        findCol(headers, ['telefono oficina', 'teléfono oficina', 'telefono oficina directo', 'teléfono oficina directo']),
        phone3:        findCol(headers, ['otro telefono', 'otro teléfono']),
        phone4:        findCol(headers, ['PHONE']),
        email:         findCol(headers, ['correo', 'email']),
        referrer:      findCol(headers, ['referrer', 'utm_referrer']),
        utm_source:    findCol(headers, ['utm_source']),
        utm_medium:    findCol(headers, ['utm_medium']),
        utm_campaign:  findCol(headers, ['utm_campaign']),
        utm_content:   findCol(headers, ['utm_content']),
        utm_term:      findCol(headers, ['utm_term']),
        fbclid:        findCol(headers, ['fbclid']),
        gclid:         findCol(headers, ['gclid']),
        ga_utm:        findCol(headers, ['ga_utm']),
        source:        findCol(headers, ['utm_source', 'fuente', 'source']),
      };

      const counts = {
        total: rows.length,
        marketingAttributed: 0,
        excludedNotMarketing: 0,
        manageable: 0,
        nonManageable: 0,
        won: 0,
        lost: 0,
        active: 0,
        incomplete: 0,
        jobSearch: 0,
        personalShipping: 0,
        outOfService: 0,
        byService: {},
        byShipments: {},
        bySource: {},
        byStatus: { won: 0, lost: 0, active: 0, other: 0 },
        lossReasons: {}
      };

      const classified = rows.map(row => {
        const status = colMap.status ? (row[colMap.status] || '') : '';
        const statusType = classifyStatus(status);
        const isMarketing = isMarketingAttribued(row, colMap);
        const jobSearch = isJobSearch(row, colMap);
        const personalShip = isPersonalShipping(row, colMap);
        const hasName = !!(colMap.name && row[colMap.name] && norm(row[colMap.name]));
        const hasContact = !!(
          (colMap.phone && row[colMap.phone] && norm(row[colMap.phone])) ||
          (colMap.phone2 && row[colMap.phone2] && norm(row[colMap.phone2])) ||
          (colMap.phone3 && row[colMap.phone3] && norm(row[colMap.phone3])) ||
          (colMap.phone4 && row[colMap.phone4] && norm(row[colMap.phone4])) ||
          (colMap.email && row[colMap.email] && norm(row[colMap.email]))
        );
        const isIncomplete = !hasContact;

        let category = 'other';

        // Primero: ¿es atribuible a Marketing?
        if (!isMarketing) {
          category = 'excluded_not_marketing';
          counts.excludedNotMarketing++;
        } else {
          // Es atribuible a Marketing
          counts.marketingAttributed++;

          // Clasificar dentro de Marketing
          if (jobSearch) {
            category = 'job_search';
            counts.jobSearch++;
            counts.nonManageable++;
          } else if (personalShip) {
            category = 'personal_shipping';
            counts.personalShipping++;
            counts.nonManageable++;
          } else if (isIncomplete) {
            category = 'incomplete';
            counts.incomplete++;
            counts.nonManageable++;
          } else {
            // Es gestionable
            category = 'manageable';
            counts.manageable++;

            // Track por status
            if (statusType === 'won') counts.won++;
            if (statusType === 'lost') {
              counts.lost++;
              const lossReason = normalizeText(status);
              counts.lossReasons[lossReason] = (counts.lossReasons[lossReason] || 0) + 1;
            }
            if (statusType === 'active') counts.active++;

            // By service
            const svc = colMap.solution ? (row[colMap.solution] || 'No especificado') : 'No especificado';
            counts.byService[svc] = (counts.byService[svc] || 0) + 1;

            // By shipments
            const shp = colMap.shipments ? (row[colMap.shipments] || 'No especificado') : 'No especificado';
            counts.byShipments[shp] = (counts.byShipments[shp] || 0) + 1;

            // By source
            const src = colMap.utm_source ? (row[colMap.utm_source] || 'directo') : 'directo';
            counts.bySource[src] = (counts.bySource[src] || 0) + 1;
          }
        }

        // Track status overall
        counts.byStatus[statusType]++;

        if (DEBUG_KOMMO) {
          console.log(`[KOMMO DEBUG] Status: "${status}" → ${statusType} | Category: ${category} | Marketing: ${isMarketing}`);
        }

        return { ...row, _category: category, _status: statusType };
      });

      const leadQualityRate = counts.marketingAttributed > 0
        ? Math.round((counts.manageable / counts.marketingAttributed) * 100)
        : 0;

      const conversionRate = counts.manageable > 0
        ? Math.round((counts.won / counts.manageable) * 100)
        : 0;

      // Debug logging
      if (DEBUG_KOMMO || true) {
        console.log('=== KOMMO PARSER SUMMARY ===');
        console.log('Total importados:', counts.total);
        console.log('Atribuibles a Marketing:', counts.marketingAttributed);
        console.log('Excluidos (no marketing):', counts.excludedNotMarketing);
        console.log('Gestionables:', counts.manageable);
        console.log('No gestionables:', counts.nonManageable);
        console.log('Ganados:', counts.won);
        console.log('Perdidos:', counts.lost);
        console.log('En gestión:', counts.active);
        console.log('Calidad del lead:', leadQualityRate + '%');
        console.log('============================');
      }

      return {
        source: 'kommo',
        filename: filename || 'reporte-kommo.csv',
        loadedAt: new Date().toISOString(),
        rowCount: rows.length,
        colMap,
        rows: classified,
        summary: {
          totalImported: counts.total,
          marketingAttributedLeads: counts.marketingAttributed || 0,
          excludedNotMarketing: counts.excludedNotMarketing || 0,
          manageableLeads: counts.manageable || 0,
          nonManageableLeads: counts.nonManageable || 0,
          wonLeads: counts.won || 0,
          lostLeads: counts.lost || 0,
          activeLeads: counts.active || 0,
          incompleteDataLeads: counts.incomplete || 0,
          jobSearchLeads: counts.jobSearch || 0,
          personalShippingLeads: counts.personalShipping || 0,
          outOfServiceLeads: counts.outOfService || 0,
          leadQualityRate: leadQualityRate || 0,
          conversionRateOverManageable: conversionRate || 0,
          byService: counts.byService || {},
          byMonthlyShipments: counts.byShipments || {},
          bySource: counts.bySource || {},
          byStatus: counts.byStatus || {},
          lossReasons: counts.lossReasons || {}
        }
      };
    }
  };
})();

// Exponer globalmente para compatibilidad con admin.js
window.KommoParser = KommoParser;

// Alias para consistencia
window.KommoParser.parseKommoCSV = window.KommoParser.parse;
