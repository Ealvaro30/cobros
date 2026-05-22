'use client';

import { useClientes } from '@/hooks/useClientes';
import { useDashboardStats } from '@/hooks/useDashboard';
import { useUIStore } from '@/stores/uiStore';
import { formatCurrency } from '@/lib/utils/index';
import { exportClientesPDF, exportDashboardPDF } from '@/lib/utils/pdf';
import { generateExcelExport, generateCSVExport } from '@/lib/utils/excel';
import { motion } from 'framer-motion';
import { FileText, FileSpreadsheet, FileDown, BarChart3 } from 'lucide-react';

export default function ReportesPage() {
  const { selectedCampanaId } = useUIStore();
  const { data: clientes } = useClientes(selectedCampanaId);
  const { data: stats } = useDashboardStats(selectedCampanaId);

  const handleExportClientesPDF = () => {
    if (!clientes) return;
    exportClientesPDF(
      clientes.map((c) => ({
        nombre: c.nombre,
        cedula: c.cedula,
        capital: c.capital,
        dias_mora: c.dias_mora,
        bucket: c.bucket,
        estado: c.estado,
        agente_nombre: c.agente_nombre,
      })),
      'Reporte de Clientes'
    );
  };

  const handleExportDashboardPDF = () => {
    if (!stats) return;
    exportDashboardPDF(stats);
  };

  const handleExportExcel = () => {
    if (!clientes) return;
    const data = clientes.map((c) => ({
      Nombre: c.nombre,
      Cedula: c.cedula || '',
      Capital: c.capital,
      'Dias Mora': c.dias_mora,
      Bucket: c.bucket || '',
      Estado: c.estado,
      Agente: c.agente_nombre || '',
      Recuperado: c.monto_recuperado,
      WhatsApp: c.whatsapp || '',
    }));
    const blob = generateExcelExport(data, 'clientes');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clientes_reporte.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    if (!clientes) return;
    const data = clientes.map((c) => ({
      Nombre: c.nombre,
      Cedula: c.cedula || '',
      Capital: c.capital,
      'Dias Mora': c.dias_mora,
      Bucket: c.bucket || '',
      Estado: c.estado,
      Agente: c.agente_nombre || '',
      Recuperado: c.monto_recuperado,
    }));
    const csv = generateCSVExport(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clientes_reporte.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exports = [
    { label: 'Clientes PDF', desc: 'Reporte completo de clientes en PDF', icon: FileText, color: 'from-red-500 to-rose-500', onClick: handleExportClientesPDF },
    { label: 'Dashboard PDF', desc: 'Resumen del dashboard financiero', icon: BarChart3, color: 'from-blue-500 to-indigo-500', onClick: handleExportDashboardPDF },
    { label: 'Excel (.xlsx)', desc: 'Exportar clientes a Excel', icon: FileSpreadsheet, color: 'from-emerald-500 to-green-500', onClick: handleExportExcel },
    { label: 'CSV', desc: 'Exportar clientes a CSV', icon: FileDown, color: 'from-amber-500 to-orange-500', onClick: handleExportCSV },
  ];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold gradient-text">Reportes</h1>
        <p className="text-sm text-muted-foreground">Exportar datos en diferentes formatos</p>
      </motion.div>

      {/* Summary */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Clientes', value: clientes?.length || 0 },
            { label: 'Capital', value: formatCurrency(stats.total_cartera) },
            { label: 'Recuperado', value: formatCurrency(stats.total_recuperado) },
            { label: 'Recuperación', value: `${stats.pct_recuperacion}%` },
          ].map((s) => (
            <div key={s.label} className="p-3 rounded-xl bg-card border border-white/5 text-center">
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
              <p className="text-sm font-bold mt-1">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Export buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {exports.map((exp, i) => {
          const Icon = exp.icon;
          return (
            <motion.button
              key={exp.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={exp.onClick}
              className="p-6 rounded-xl border border-white/5 bg-card hover:border-white/15 transition-all text-left group"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${exp.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold">{exp.label}</h3>
              <p className="text-xs text-muted-foreground mt-1">{exp.desc}</p>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
