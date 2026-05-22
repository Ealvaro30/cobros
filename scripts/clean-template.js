const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const rawData = ``;

function cleanData() {
  const csvPath = path.join(__dirname, '../plantilla_clientes.csv');
  const lines = rawData.split('\n');
  const cleanedRows = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    let parts = line.split('\t');
    parts = parts.map(p => p.trim());
    
    let id = "";
    let firstPart = parts[0] || "";
    let firstColVal = "";
    
    // Handle the case where the first field was comma-separated like "DESASINADO,125482"
    if (firstPart.includes(',')) {
      const subParts = firstPart.split(',');
      firstColVal = subParts[0].trim();
      id = subParts[1].trim();
    } else {
      firstColVal = firstPart;
      id = parts[1] || "";
    }
    
    if (!id && /^\d+$/.test(firstColVal)) {
      id = firstColVal;
      firstColVal = "";
    }
    
    let capitalCordobasStr = "";
    let cedulaStr = "";
    let nombreStr = "";
    let capitalDolaresStr = "";
    let estadoStr = "";
    let bucketStr = "";
    let agenteStr = "";
    let telefonoStr = "";
    let promesaStr = "";

    // If first column contains a date (like "14 may") or "DESASINADO"
    if (firstColVal && (/^\d{1,2}\s+may$/i.test(firstColVal) || firstColVal === 'DESASINADO')) {
      promesaStr = firstColVal;
    }

    parts.forEach(part => {
      if (!part) return;
      
      // Clean leading comma
      if (part.startsWith(',')) {
        part = part.substring(1).trim();
      }

      // Check patterns in a strict order
      if (part.includes('C$')) {
        // 1. Cordobas Capital
        capitalCordobasStr = part.replace(/[,C$\s]/g, '');
      } else if (part.includes('$')) {
        // 2. Dolares Capital
        capitalDolaresStr = part.replace(/[$,\s]/g, '');
      } else if (/^\d{3}\s\d{6}\s\d{4}[A-Z]$/.test(part) || /^\d{3}-\d{6}-\d{4}[A-Z]$/.test(part)) {
        // 3. Cédula
        cedulaStr = part.replace(/\s+/g, '-');
      } else if (/^\d{6}$/.test(part)) {
        // 4. ID
        id = part;
      } else if (/^\d{8}$/.test(part)) {
        // 5. Phone / WAP
        telefonoStr = part;
      } else if (part === '5' || part === '6') {
        // 6. Bucket
        bucketStr = part;
      } else if (part === 'SALVADA' || part === 'NO SALVADA') {
        // 7. Estado
        estadoStr = part;
      } else if (/^[A-Z]{2}\d{4}[A-Z]{2}$/.test(part)) {
        // 8. Agente
        agenteStr = part;
      } else if (/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(part)) {
        // 9. Text fields (Name or Date/Status)
        if (/^\d{1,2}\s+may$/i.test(part) || part === 'DESASINADO') {
          promesaStr = (promesaStr && promesaStr !== part) ? (promesaStr + " | " + part) : part;
        } else {
          // It's the Name!
          nombreStr = part;
        }
      }
    });

    // Default fallbacks and formatting
    if (!id) id = `${i}`;
    if (!nombreStr) nombreStr = "Cliente Sin Nombre";
    if (!cedulaStr) cedulaStr = "000-000000-0000A";
    const capital = parseFloat(capitalCordobasStr) || 0;
    const dolares = parseFloat(capitalDolaresStr) || 0;
    const bucket = parseInt(bucketStr) || 5;
    const estado = estadoStr || "NO CONTESTA";
    const wap = telefonoStr ? `+505${telefonoStr}` : "";
    const agente = agenteStr || "";
    const promesa = promesaStr || "";

    cleanedRows.push({
      ID: id,
      NOMBRE: nombreStr,
      CEDULA: cedulaStr,
      CAPITAL: capital,
      DOLARES: dolares,
      BUCKET: bucket,
      ESTADO: estado,
      WAP: wap,
      PROMESA: promesa,
      AGENTE: agente
    });
  }

  // 1. Write cleaned CSV
  const headers = ['ID', 'NOMBRE', 'CEDULA', 'CAPITAL', 'DOLARES', 'BUCKET', 'ESTADO', 'WAP', 'PROMESA', 'AGENTE'];
  const csvLines = [headers.join(',')];
  
  cleanedRows.forEach(row => {
    const line = headers.map(h => {
      let val = row[h];
      if (typeof val === 'string' && val.includes(',')) {
        return `"${val}"`;
      }
      return val;
    }).join(',');
    csvLines.push(line);
  });

  fs.writeFileSync(csvPath, csvLines.join('\n'), 'utf8');
  console.log('✅ plantilla_clientes.csv ha sido saneado con éxito.');

  // 2. Write cleaned XLSX
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(cleanedRows);
  XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
  XLSX.writeFile(wb, path.join(__dirname, '../plantilla_clientes.xlsx'));
  console.log('✅ plantilla_clientes.xlsx ha sido generado con éxito.');
}

cleanData();
