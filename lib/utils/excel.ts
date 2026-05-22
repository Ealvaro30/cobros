import * as ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';

export interface ExcelRow {
  PROMESA?: string;
  ID?: string;
  CAPITAL?: number;
  CEDULA?: string;
  NOMBRE?: string;
  DOLARES?: number;
  ESTADO?: string;
  BUCKET?: number;
  AGENTE?: string;
  WAP?: string;
  TIPO?: string;
  COLOR_PROMESA?: string; 
  FECHA_PROMESA?: Date;   
  OPERACIONES?: string; // New field to support dynamic operations
}

const REQUIRED_COLUMNS = ['ID', 'NOMBRE'];

export async function parseExcelFile(buffer: ArrayBuffer): Promise<{
  data: ExcelRow[];
  errors: string[];
}> {
  const errors: string[] = [];
  const workbook = new ExcelJS.Workbook();
  
  try {
    await workbook.xlsx.load(buffer);
  } catch (error) {
    errors.push('Error al leer el archivo Excel. Asegúrese de que es un archivo .xlsx válido.');
    return { data: [], errors };
  }

  const sheet = workbook.worksheets[0];
  if (!sheet || sheet.rowCount === 0) {
    errors.push('El archivo está vacío');
    return { data: [], errors };
  }

  // Identificar encabezados (fila 1 por defecto)
  const headerRow = sheet.getRow(1);
  const headers: { [key: string]: number } = {};
  headerRow.eachCell((cell, colNumber) => {
    const val = cell.value ? String(cell.value).toUpperCase().trim() : '';
    if (val) headers[val] = colNumber;
  });

  for (const col of REQUIRED_COLUMNS) {
    if (!headers[col]) {
      errors.push(`Columna requerida "${col}" no encontrada`);
    }
  }

  if (errors.length > 0) return { data: [], errors };

  const data: ExcelRow[] = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header

    // Helper para obtener valor de celda seguro
    const getVal = (colName: string) => {
      const colNum = headers[colName];
      if (!colNum) return '';
      const cell = row.getCell(colNum);
      if (cell.value && typeof cell.value === 'object' && 'formula' in cell.value) {
        return cell.value.result;
      }
      return cell.value;
    };

    const promesaCell = headers['PROMESA'] ? row.getCell(headers['PROMESA']) : null;
    let colorHex = '';
    
    // Extraer color de fondo (fill) si existe
    if (promesaCell && promesaCell.fill && promesaCell.fill.type === 'pattern' && promesaCell.fill.fgColor) {
      if (promesaCell.fill.fgColor.argb) {
        colorHex = promesaCell.fill.fgColor.argb;
      } else if (promesaCell.fill.fgColor.theme !== undefined) {
        // Fallback básico si usa temas
        colorHex = 'theme:' + promesaCell.fill.fgColor.theme;
      }
    }

    // Extraer fecha si la promesa es del tipo fecha
    let fechaPromesa: Date | undefined = undefined;
    if (promesaCell && promesaCell.value instanceof Date) {
      fechaPromesa = promesaCell.value;
    }

    const rowData: ExcelRow = {
      PROMESA: String(getVal('PROMESA') || ''),
      ID: String(getVal('ID') || ''),
      CAPITAL: Number(getVal('CAPITAL') || 0),
      CEDULA: String(getVal('CEDULA') || ''),
      NOMBRE: String(getVal('NOMBRE') || ''),
      DOLARES: Number(getVal('DOLARES') || 0),
      ESTADO: String(getVal('ESTADO') || ''),
      BUCKET: Number(getVal('BUCKET') || 0),
      AGENTE: String(getVal('AGENTE') || ''),
      WAP: String(getVal('WAP') || ''),
      TIPO: String(getVal('TIPO') || '').toUpperCase().trim(),
      COLOR_PROMESA: colorHex,
      FECHA_PROMESA: fechaPromesa,
      OPERACIONES: String(getVal('OPERACIONES') || ''), // Parse the operations string
    };

    // Solo agregar si tiene nombre e ID (no filas completamente vacías)
    if (rowData.NOMBRE && rowData.ID) {
      data.push(rowData);
    }
  });

  return { data, errors };
}

export function generateExcelExport(data: Record<string, unknown>[], filename: string): Blob {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos');
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

export function generateCSVExport(data: Record<string, unknown>[]): string {
  const worksheet = XLSX.utils.json_to_sheet(data);
  return XLSX.utils.sheet_to_csv(worksheet);
}

export function downloadImportTemplate() {
  const templateData = [
    {
      ID: 'CLI-0001 (Obligatorio)',
      NOMBRE: 'Juan Perez (Obligatorio)',
      CEDULA: '000-000000-0000A (Obligatorio)',
      CAPITAL: 10000,
      DOLARES: 0,
      BUCKET: 5,
      ESTADO: 'NO CONTESTA',
      WAP: '50588888888',
      PROMESA: '15/05/2026',
      TIPO: 'PROMESA',
      AGENTE: 'AE9392NI',
      OPERACIONES: 'OP-1001:500:5000, OP-1002:300:5000'
    },
    {
      ID: 'CLI-0002',
      NOMBRE: 'Maria Gonzalez',
      CEDULA: '000-000000-0000B',
      CAPITAL: 25000.50,
      DOLARES: 1500.00,
      BUCKET: 6,
      ESTADO: 'PROMESA DE PAGO',
      WAP: '50577777777',
      PROMESA: 'Cliente promete cancelar mañana',
      TIPO: 'SEGUIMIENTO',
      AGENTE: '',
      OPERACIONES: 'OP-1020:1500:25000'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  
  // Agregar algo de ancho a las columnas
  const wscols = [
    { wch: 20 }, // ID
    { wch: 35 }, // NOMBRE
    { wch: 25 }, // CEDULA
    { wch: 15 }, // CAPITAL
    { wch: 15 }, // DOLARES
    { wch: 10 }, // BUCKET
    { wch: 20 }, // ESTADO
    { wch: 15 }, // WAP
    { wch: 40 }, // PROMESA
    { wch: 15 }, // TIPO
    { wch: 15 }, // AGENTE
    { wch: 35 }  // OPERACIONES
  ];
  worksheet['!cols'] = wscols;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'PlantillaClientes');
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'plantilla_importacion_clientes.xlsx';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
