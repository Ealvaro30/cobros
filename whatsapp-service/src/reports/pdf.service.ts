import { Injectable, Logger } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import { format } from 'date-fns';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  constructor() {}

  public async generateSummaryPdf(data: any): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const dateStr = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
        const fileName = `Resumen_Diario_${dateStr}.pdf`;
        // Create temp file in dist or root
        const outputPath = path.resolve(__dirname, '../../../../', fileName);
        
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(outputPath);
        doc.pipe(stream);

        // Header
        doc.fontSize(20).text('Reporte Fin del Día', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Fecha: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, { align: 'center' });
        doc.moveDown(2);

        // General Stats
        doc.fontSize(16).text('Métricas Generales', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(12).text(`Clientes Gestionados: ${data.gestionados || 0}`);
        doc.text(`Promesas de Pago: ${data.promesas || 0}`);
        doc.text(`Clientes Salvados: ${data.salvados || 0}`);
        doc.text(`Pendientes: ${data.pendientes || 0}`);
        doc.text(`Sin Respuesta: ${data.sinRespuesta || 0}`);
        doc.text(`Rechazos: ${data.rechazos || 0}`);
        doc.moveDown(2);

        // Buckets
        if (data.buckets) {
          doc.fontSize(16).text('Gestión por Bucket', { underline: true });
          doc.moveDown(0.5);
          for (const [bucket, count] of Object.entries(data.buckets)) {
            doc.fontSize(12).text(`${bucket}: ${count}`);
          }
          doc.moveDown(2);
        }

        // Agentes
        if (data.agentes) {
          doc.fontSize(16).text('Gestión por Agente', { underline: true });
          doc.moveDown(0.5);
          let bestAgent = null;
          let maxGestiones = -1;

          for (const agent of data.agentes) {
            doc.fontSize(12).text(`${agent.nombre || 'Desconocido'}: ${agent.count} gestiones`);
            if (agent.count > maxGestiones) {
              maxGestiones = agent.count;
              bestAgent = agent.nombre;
            }
          }

          doc.moveDown();
          if (bestAgent) {
            doc.fontSize(14).text(`🏆 Agente más productivo: ${bestAgent}`, { align: 'center' });
          }
        }

        doc.end();

        stream.on('finish', () => {
          this.logger.log(`PDF generated at ${outputPath}`);
          resolve(outputPath);
        });

        stream.on('error', (err) => {
          reject(err);
        });

      } catch (err) {
        this.logger.error('Failed to generate PDF', err);
        reject(err);
      }
    });
  }
}
