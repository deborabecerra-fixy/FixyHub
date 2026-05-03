const GoogleAdsParser = (() => {
  const NON_COMMERCIAL = [
    'envío particular', 'envio particular', 'mandar paquete',
    'enviar paquete', 'paquete personal', 'precio envío', 'precio envio',
    'correo', 'encomienda'
  ];

  function parseNum(val) {
    if (!val) return 0;
    return parseFloat(String(val).replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
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

  function isNonCommercial(term) {
    const t = term.toLowerCase();
    return NON_COMMERCIAL.some(nc => t.includes(nc));
  }

  return {
    parse(csvText, filename) {
      const lines = csvText.trim().split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) throw new Error('Archivo vacío.');

      // Google Ads CSV may have summary rows at the bottom — skip them
      const dataLines = lines.filter(l => !l.startsWith('Total') && !l.startsWith('"Total'));

      const sep = detectSep(dataLines[0]);
      const headers = splitLine(dataLines[0], sep).map(h => h.replace(/^"|"$/g, '').trim());
      const rows = [];
      for (let i = 1; i < dataLines.length; i++) {
        const vals = splitLine(dataLines[i], sep).map(v => v.replace(/^"|"$/g, '').trim());
        if (vals.every(v => !v)) continue;
        const row = {};
        headers.forEach((h, j) => { row[h] = vals[j] || ''; });
        rows.push(row);
      }

      const colCampaign   = findCol(headers, ['campaña', 'campaign name', 'campaign']);
      const colStatus     = findCol(headers, ['estado', 'status']);
      const colSpend      = findCol(headers, ['importe', 'spend', 'cost', 'coste', 'gasto']);
      const colClicks     = findCol(headers, ['clics', 'clicks']);
      const colImpress    = findCol(headers, ['impresiones', 'impressions']);
      const colCTR        = findCol(headers, ['ctr']);
      const colCPC        = findCol(headers, ['cpc', 'coste medio', 'avg. cpc']);
      const colConv       = findCol(headers, ['conversiones', 'conversions']);
      const colCostConv   = findCol(headers, ['costo por conversión', 'cost per conversion', 'cost / conv']);
      const colKeyword    = findCol(headers, ['palabra clave', 'keyword', 'search term', 'término']);

      let totalSpend = 0, totalClicks = 0, totalImpress = 0, totalConv = 0;
      let activeCampaigns = 0;
      const problematicTerms = [];
      const campaignsToReview = [];
      const seen = new Set();

      rows.forEach(r => {
        totalSpend   += parseNum(colSpend   ? r[colSpend]   : 0);
        totalClicks  += parseNum(colClicks  ? r[colClicks]  : 0);
        totalImpress += parseNum(colImpress ? r[colImpress] : 0);
        totalConv    += parseNum(colConv    ? r[colConv]    : 0);

        const status  = colStatus   ? (r[colStatus]   || '').toLowerCase() : '';
        const name    = colCampaign ? (r[colCampaign] || '')               : '';
        const keyword = colKeyword  ? (r[colKeyword]  || '').toLowerCase() : '';
        const spend   = parseNum(colSpend ? r[colSpend] : 0);
        const conv    = parseNum(colConv  ? r[colConv]  : 0);

        if (status.includes('habilitada') || status.includes('enabled') || status.includes('activ')) {
          if (name && !seen.has(name)) { activeCampaigns++; seen.add(name); }
        }

        if (keyword && isNonCommercial(keyword)) {
          if (!problematicTerms.includes(keyword)) problematicTerms.push(keyword);
        }

        if (spend > 0 && conv === 0 && name && !campaignsToReview.includes(name)) {
          campaignsToReview.push(name);
        }
      });

      const costPerConv = totalConv > 0 ? Math.round(totalSpend / totalConv) : 0;

      return {
        source: 'google',
        filename: filename || 'reporte-google.csv',
        loadedAt: new Date().toISOString(),
        rowCount: rows.length,
        rows,
        colCampaign, colStatus, colSpend, colClicks, colImpress, colCTR, colCPC, colConv, colCostConv,
        summary: {
          totalSpend: Math.round(totalSpend),
          totalClicks: Math.round(totalClicks),
          totalImpressions: Math.round(totalImpress),
          totalConversions: Math.round(totalConv),
          costPerConversion: costPerConv,
          activeCampaigns,
          problematicTerms,
          campaignsToReview
        }
      };
    }
  };
})();
