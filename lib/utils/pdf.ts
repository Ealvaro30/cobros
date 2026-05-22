import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatDate } from './index';

export function exportClientesPDF(
  data: Array<{
    nombre: string;
    cedula: string | null;
    capital: number;
    dias_mora: number;
    bucket: number | null;
    estado: string;
    agente_nombre?: string | null;
  }>,
  title: string = 'Reporte de Clientes'
) {
  const doc = new jsPDF('landscape');

  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59);
  doc.text(title, 14, 22);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generado: ${formatDate(new Date())}`, 14, 30);

  autoTable(doc, {
    startY: 36,
    head: [['Nombre', 'Cédula', 'Capital', 'Días Mora', 'Bucket', 'Estado', 'Agente']],
    body: data.map((c) => [
      c.nombre,
      c.cedula || '-',
      formatCurrency(c.capital),
      c.dias_mora.toString(),
      c.bucket?.toString() || '-',
      c.estado,
      c.agente_nombre || '-',
    ]),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    alternateRowStyles: { fillColor: [241, 245, 249] },
  });

  doc.save(`${title.replace(/\s+/g, '_').toLowerCase()}.pdf`);
}

export function exportDashboardPDF(stats: {
  total_cartera: number;
  total_recuperado: number;
  total_pendiente: number;
  pct_recuperacion: number;
}) {
  const doc = new jsPDF();

  doc.setFontSize(20);
  doc.text('Dashboard Financiero - GMG Cobranzas', 14, 22);

  doc.setFontSize(10);
  doc.text(`Fecha: ${formatDate(new Date())}`, 14, 30);

  autoTable(doc, {
    startY: 40,
    head: [['Métrica', 'Valor']],
    body: [
      ['Total Cartera', formatCurrency(stats.total_cartera)],
      ['Total Recuperado', formatCurrency(stats.total_recuperado)],
      ['Total Pendiente', formatCurrency(stats.total_pendiente)],
      ['% Recuperación', `${stats.pct_recuperacion}%`],
    ],
    styles: { fontSize: 11 },
    headStyles: { fillColor: [30, 41, 59] },
  });

  doc.save('dashboard_financiero.pdf');
}
