const KommoParser = (() => {
  function norm(val) {
    return (val || '').toLowerCase().trim();
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
    const allText = headers.map(h => norm(row[h])).join(' ');
    return FIXY_CONFIG.excludedKeywords
      .filter(kw => kw.includes('trabajo') || kw.includes('empleo') || kw.includes('cv') ||
                    kw.includes('repartidor') || kw.includes('chofer') || kw.includes('moto') ||
                    kw.includes('postular') || kw.includes('busco'))
      .some(kw => allText.includes(kw));
  }

  function isPersonalShipping(row, headers) {
    const allText = headers.map(h => norm(row[h])).join(' ');
    return FIXY_CONFIG.excludedKeywords
      .filter(kw => kw.includes('particular') || kw.includes('paquete') || kw.includes('mandar') ||
                    kw.includes('enviar') || kw.includes('precio'))
      .some(kw => allText.includes(kw));
  }

  function hasValidSource(row, colMap) {
    const src = norm(row[colMap.source] || '') + ' ' +
                norm(row[colMap.utm_source] || '') + ' ' +
                norm(row[colMap.utm_medium] || '') + ' ' +
                norm(row[colMap.referrer] || '');
    const hasUTM = row[colMap.utm_source] || row[colMap.utm_medium] || row[colMap.utm_campaign];
    const hasFb  = row[colMap.fbclid];
    const hasGcl = row[colMap.gclid];
    const hasRef = row[colMap.referrer];
    const sourceMatch = FIXY_CONFIG.allowedLeadSources.some(s => src.includes(s));
    const phoneMatch = FIXY_CONFIG.allowedPhones
      .filter(p => !p.startsWith('COMPLETAR'))
      .some(p => {
        const phone = norm(row[colMap.phone] || '') + norm(row[colMap.phone2] || '');
        return phone.includes(p);
      });
    return !!(hasUTM || hasFb || hasGcl || (hasRef && sourceMatch) || phoneMatch);
  }

  function classifyStatus(status) {
    const s = norm(status);
    if (FIXY_CONFIG.wonStatuses.some(w => s.includes(norm(w)))) return 'won';
    if (FIXY_CONFIG.lostStatuses.some(l => s.includes(norm(l)))) return 'lost';
    if (FIXY_CONFIG.activeStatuses.some(a => s.includes(norm(a)))) return 'active';
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
        created:       findCol(headers, ['fecha de creación', 'created']),
        closed:        findCol(headers, ['cerrado', 'closed']),
        tags:          findCol(headers, ['etiquetas', 'tags']),
        notes:         findCol(headers, ['nota', 'note']),
        solution:      findCol(headers, ['qué solución', 'solución', 'solution']),
        shipments:     findCol(headers, ['cuántos envíos', 'cant de envios', 'envíos']),
        phone:         findCol(headers, ['phone', 'teléfono', 'telefono', 'celular']),
        phone2:        findCol(headers, ['teléfono oficina']),
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
        validMarketing: 0,
        excluded: 0,
        manageable: 0,
        nonManageable: 0,
        won: 0, lost: 0, active: 0,
        incomplete: 0, jobSearch: 0, personalShipping: 0, outOfSource: 0,
        byService: {}, byShipments: {}, bySource: {}, lossReasons: {}
      };

      const classified = rows.map(row => {
        const status = colMap.status ? (row[colMap.status] || '') : '';
        const statusType = classifyStatus(status);
        const hasSource = hasValidSource(row, colMap);
        const jobSearch = isJobSearch(row, headers);
        const personalShip = isPersonalShipping(row, headers);
        const hasName = !!(colMap.name && row[colMap.name]);
        const hasContact = !!(
          (colMap.phone && row[colMap.phone]) ||
          (colMap.email && row[colMap.email])
        );
        const isIncomplete = !hasName && !hasContact;

        let category;
        if (jobSearch) { category = 'job_search'; counts.jobSearch++; counts.nonManageable++; counts.excluded++; }
        else if (personalShip) { category = 'personal_shipping'; counts.personalShipping++; counts.nonManageable++; counts.excluded++; }
        else if (isIncomplete) { category = 'incomplete'; counts.incomplete++; counts.nonManageable++; counts.excluded++; }
        else if (!hasSource) { category = 'out_of_source'; counts.outOfSource++; counts.nonManageable++; counts.excluded++; }
        else {
          category = 'manageable';
          counts.manageable++;
          counts.validMarketing++;

          if (statusType === 'won')  counts.won++;
          if (statusType === 'lost') counts.lost++;
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

        return { ...row, _category: category, _status: statusType };
      });

      const manageableRate = counts.total > 0
        ? Math.round((counts.manageable / counts.total) * 100)
        : 0;

      const conversionRate = counts.manageable > 0
        ? Math.round((counts.won / counts.manageable) * 100)
        : 0;

      return {
        source: 'kommo',
        filename: filename || 'reporte-kommo.csv',
        loadedAt: new Date().toISOString(),
        rowCount: rows.length,
        colMap,
        rows: classified,
        summary: {
          totalImported: counts.total,
          validMarketingLeads: counts.validMarketing,
          excludedLeads: counts.excluded,
          manageableLeads: counts.manageable,
          nonManageableLeads: counts.nonManageable,
          wonLeads: counts.won,
          lostLeads: counts.lost,
          activeLeads: counts.active,
          incompleteDataLeads: counts.incomplete,
          jobSearchLeads: counts.jobSearch,
          personalShippingLeads: counts.personalShipping,
          outOfSourceLeads: counts.outOfSource,
          manageableRate,
          conversionRateOverManageable: conversionRate,
          byService: counts.byService,
          byMonthlyShipments: counts.byShipments,
          bySource: counts.bySource
        }
      };
    }
  };
})();
