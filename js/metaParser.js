const MetaParser = (() => {
  function parseNum(val) {
    if (!val) return 0;
    return parseFloat(String(val).replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
  }

  function findCol(headers, candidates) {
    const h = headers.map(x => x.toLowerCase());
    for (const c of candidates) {
      const idx = h.findIndex(x => x.includes(c));
      if (idx >= 0) return headers[idx];
    }
    return null;
  }

  function detectSep(line) {
    return line.includes(';') ? ';' : ',';
  }

  function splitCSVLine(line, sep) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === sep && !inQuotes) { result.push(current.trim()); current = ''; }
      else { current += ch; }
    }
    result.push(current.trim());
    return result;
  }

  return {
    parse(csvText, filename) {
      const lines = csvText.trim().split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) throw new Error('El archivo está vacío o tiene solo encabezados.');

      const sep = detectSep(lines[0]);
      const headers = splitCSVLine(lines[0], sep).map(h => h.replace(/^"|"$/g, '').trim());

      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        const vals = splitCSVLine(lines[i], sep).map(v => v.replace(/^"|"$/g, '').trim());
        if (vals.every(v => !v)) continue;
        const row = {};
        headers.forEach((h, j) => { row[h] = vals[j] || ''; });
        rows.push(row);
      }

      // Column detection
      const colName    = findCol(headers, ['nombre de la campaña', 'campaign name', 'campaña', 'campaign']);
      const colStatus  = findCol(headers, ['entrega de la campaña', 'delivery', 'estado', 'status']);
      const colSpend   = findCol(headers, ['importe gastado', 'amount spent', 'spend', 'gasto']);
      const colImpress = findCol(headers, ['impresiones', 'impressions']);
      const colReach   = findCol(headers, ['alcance', 'reach']);
      const colResults = findCol(headers, ['resultados', 'results', 'conversiones']);
      const colCPR     = findCol(headers, ['costo por resultados', 'cost per result', 'cpr']);
      const colStart   = findCol(headers, ['inicio del informe', 'start date', 'inicio']);
      const colEnd     = findCol(headers, ['fin del informe', 'end date', 'fin']);

      let totalSpent = 0, totalImpressions = 0, totalReach = 0;
      let totalResults = 0, activeCampaigns = 0;
      let bestCampaign = null, bestCPR = Infinity;
      const campaignsToReview = [];

      rows.forEach(r => {
        const spend   = parseNum(colSpend   ? r[colSpend]   : 0);
        const impress = parseNum(colImpress ? r[colImpress] : 0);
        const reach   = parseNum(colReach   ? r[colReach]   : 0);
        const results = parseNum(colResults ? r[colResults] : 0);
        const cpr     = parseNum(colCPR     ? r[colCPR]     : 0);
        const status  = colStatus ? (r[colStatus] || '').toLowerCase() : '';
        const name    = colName   ? (r[colName]   || 'Sin nombre') : 'Sin nombre';

        totalSpent       += spend;
        totalImpressions += impress;
        totalReach       += reach;
        totalResults     += results;

        if (status.includes('activ') || status.includes('active')) activeCampaigns++;

        if (spend > 0 && results === 0) {
          campaignsToReview.push(name);
        }

        if (results > 0 && cpr > 0 && cpr < bestCPR) {
          bestCPR = cpr;
          bestCampaign = name;
        }
      });

      const averageCostPerResult = totalResults > 0
        ? Math.round(totalSpent / totalResults)
        : 0;

      return {
        source: 'meta',
        filename: filename || 'reporte-meta.csv',
        loadedAt: new Date().toISOString(),
        rowCount: rows.length,
        colName, colStatus, colSpend, colImpress, colReach, colResults,
        dateRange: [
          colStart ? rows[0]?.[colStart] : '',
          colEnd   ? rows[0]?.[colEnd]   : ''
        ].filter(Boolean).join(' — '),
        rows,
        summary: {
          totalCampaigns: rows.length,
          activeCampaigns,
          totalSpent: Math.round(totalSpent),
          totalResults,
          totalImpressions: Math.round(totalImpressions),
          totalReach: Math.round(totalReach),
          averageCostPerResult,
          bestCampaign,
          campaignsToReview
        }
      };
    }
  };
})();
