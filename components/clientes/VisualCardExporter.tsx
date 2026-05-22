'use client';

import { formatCurrency, formatNumber } from '@/lib/utils/index';
import type { ClienteDetalle } from '@/types';
import { CreditCard, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface VisualCardExporterProps {
  cliente: ClienteDetalle;
}

export function VisualCardExporter({ cliente }: VisualCardExporterProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = () => {
    setExporting(true);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 450;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 1. Fondo Oscuro Premium con Degradado
      const bgGrad = ctx.createLinearGradient(0, 0, 800, 450);
      bgGrad.addColorStop(0, '#090d16');
      bgGrad.addColorStop(1, '#0e172a');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 800, 450);

      // Glows decorativos (Neon)
      const glow1 = ctx.createRadialGradient(100, 100, 10, 100, 100, 150);
      glow1.addColorStop(0, 'rgba(59, 130, 246, 0.08)');
      glow1.addColorStop(1, 'rgba(59, 130, 246, 0)');
      ctx.fillStyle = glow1;
      ctx.fillRect(0, 0, 800, 450);

      const glow2 = ctx.createRadialGradient(700, 350, 10, 700, 350, 200);
      glow2.addColorStop(0, 'rgba(6, 182, 212, 0.08)');
      glow2.addColorStop(1, 'rgba(6, 182, 212, 0)');
      ctx.fillStyle = glow2;
      ctx.fillRect(0, 0, 800, 450);

      // Líneas decorativas tecnológicas
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 800; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 450);
        ctx.stroke();
      }
      for (let i = 0; i < 450; i += 40) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(800, i);
        ctx.stroke();
      }

      // 2. Encabezado Branding
      // Logo Símbolo
      ctx.beginPath();
      ctx.arc(60, 50, 15, 0, 2 * Math.PI);
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(60, 50, 8, 0, Math.PI);
      ctx.strokeStyle = '#06b6d4';
      ctx.stroke();

      // Logo Texto
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
      ctx.fillText('GMG COBRANZAS', 90, 56);

      ctx.fillStyle = '#64748b';
      ctx.font = '600 11px system-ui, -apple-system, sans-serif';
      ctx.fillText('FICHA FINANCIERA OFICIAL', 90, 72);

      // Marca de Agua / Línea de Corte
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.fillRect(40, 95, 720, 2);

      // 3. Columna Izquierda: Información del Cliente
      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 11px system-ui, -apple-system, sans-serif';
      ctx.fillText('CLIENTE', 50, 135);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
      // Recortar nombre si es muy largo
      let clientName = cliente.nombre || 'N/A';
      if (clientName.length > 26) clientName = clientName.substring(0, 24) + '...';
      ctx.fillText(clientName, 50, 165);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 12px system-ui, -apple-system, sans-serif';
      ctx.fillText(`Cédula: ${cliente.cedula || 'N/A'}`, 50, 195);
      ctx.fillText(`ID Cliente: ${cliente.id_cliente || 'N/A'}`, 50, 215);
      ctx.fillText(`WhatsApp: ${cliente.whatsapp || cliente.telefono || 'N/A'}`, 50, 235);
      ctx.fillText(`Empresa: ${cliente.empresa || 'N/A'}`, 50, 255);

      // Campaña
      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 11px system-ui, -apple-system, sans-serif';
      ctx.fillText('CAMPAÑA ASOCIADA', 50, 310);
      ctx.fillStyle = '#3b82f6';
      ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
      ctx.fillText(cliente.campana_nombre || 'Sin Campaña', 50, 335);

      // 4. Columna Derecha: Información Financiera
      // Caja Capital
      ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      
      // Rectángulo Capital
      ctx.beginPath();
      ctx.roundRect(450, 120, 300, 75, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 10px system-ui, -apple-system, sans-serif';
      ctx.fillText('CAPITAL PENDIENTE (CORDOBAS)', 465, 142);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
      ctx.fillText(formatCurrency(cliente.capital), 465, 172);

      // Rectángulo Dólares (Auto-calculado)
      ctx.fillStyle = 'rgba(59, 130, 246, 0.02)';
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.15)';
      ctx.beginPath();
      ctx.roundRect(450, 210, 300, 75, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#3b82f6';
      ctx.font = '600 10px system-ui, -apple-system, sans-serif';
      ctx.fillText('SALDO EQUIVALENTE (USD)', 465, 232);
      ctx.fillStyle = '#3b82f6';
      ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
      ctx.fillText(`$ ${formatNumber(cliente.saldo_dolares)}`, 465, 262);

      // 5. Badges de Estado y Bucket
      // Badge Bucket
      const bColor = cliente.bucket === 6 ? '#06b6d4' : '#3b82f6';
      ctx.fillStyle = bColor + '15';
      ctx.strokeStyle = bColor + '30';
      ctx.beginPath();
      ctx.roundRect(450, 310, 140, 30, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = bColor;
      ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
      ctx.fillText(`BUCKET ${cliente.bucket || 5}`, 485, 329);

      // Badge Estado
      ctx.fillStyle = 'rgba(16, 185, 129, 0.1)';
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.25)';
      ctx.beginPath();
      ctx.roundRect(610, 310, 140, 30, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
      let statusText = cliente.estado || 'NO CONTESTA';
      if (statusText.length > 16) statusText = statusText.substring(0, 14) + '..';
      ctx.fillText(statusText, 625, 329);

      // 6. Pie de Página: Gestor Asignado
      ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.fillRect(40, 375, 720, 1);

      ctx.fillStyle = '#64748b';
      ctx.font = '600 10px system-ui, -apple-system, sans-serif';
      ctx.fillText('GESTOR ASIGNADO', 50, 405);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
      ctx.fillText(cliente.agente_nombre || 'Sin Agente Asignado', 50, 423);

      ctx.fillStyle = '#64748b';
      ctx.font = '600 10px system-ui, -apple-system, sans-serif';
      ctx.fillText('FECHA DE CONSULTA', 550, 405);
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
      ctx.fillText(new Date().toLocaleDateString('es-NI', { year: 'numeric', month: 'long', day: 'numeric' }), 550, 423);

      // 7. Descargar la imagen
      const link = document.createElement('a');
      link.download = `GMG_CLIENTE_${(cliente.id_cliente || cliente.cedula || 'COD').replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Error al exportar ficha visual:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10 transition-all active:scale-95 disabled:opacity-50"
      title="Exportar Ficha de Presentación Visual en PNG"
    >
      {exporting ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
      ) : (
        <CreditCard className="w-3.5 h-3.5 text-cyan-400" />
      )}
      <span>Exportar Ficha Visual</span>
    </button>
  );
}
