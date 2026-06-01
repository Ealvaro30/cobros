import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseService } from '../supabase/supabase.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { ConfigService } from '../config/config.service';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly whatsappService: WhatsappService,
    private readonly configService: ConfigService,
  ) { }

  @Cron(CronExpression.EVERY_DAY_AT_6PM)
  async handleDailyReport() {
    this.logger.log('Iniciando generación de reporte diario de IA...');
    try {
      const pdfPath = await this.generateDailyPDF();
      await this.sendReportViaWhatsApp(pdfPath);
      this.logger.log('Reporte diario enviado con éxito.');
    } catch (error) {
      this.logger.error('Error generando o enviando reporte diario', error);
    }
  }

  private async generateDailyPDF(): Promise<string> {
    return new Promise(async (resolve, reject) => {
      try {
        const supabase = this.supabaseService.getClient();

        // Fetch stats for today
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { count: promises } = await supabase
          .from('ai_analysis_logs')
          .select('*', { count: 'exact', head: true })
          .eq('detected_promise', true)
          .gte('created_at', today.toISOString());

        const { count: risks } = await supabase
          .from('whatsapp_messages')
          .select('*', { count: 'exact', head: true })
          .eq('ai_risk', 'ALTO')
          .gte('timestamp', today.toISOString());

        const doc = new PDFDocument();
        const tmpDir = path.join(__dirname, '../../tmp');
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

        const filePath = path.join(tmpDir, `reporte_diario_${Date.now()}.pdf`);
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Header
        doc.fontSize(20).text('GMG Servicios - Resumen de WhatsApp AI', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`);
        doc.moveDown();

        // Stats
        doc.fontSize(16).text('Estadísticas Operativas del Día');
        doc.moveDown();
        doc.fontSize(12).text(`- Promesas de Pago Detectadas: ${promises || 0}`);
        doc.text(`- Clientes con Riesgo Alto (Fuga): ${risks || 0}`);

        doc.moveDown();
        doc.text('Nota: Este reporte es autogenerado por el Centro de Inteligencia Artificial (Claude-3-Haiku).');

        doc.end();

        stream.on('finish', () => resolve(filePath));
        stream.on('error', reject);

      } catch (err) {
        reject(err);
      }
    });
  }

  private async sendReportViaWhatsApp(filePath: string) {
    const client = this.whatsappService.getClient();
    const adminPhone = this.configService.get('ADMIN_WHATSAPP_NUMBER'); // ej: '50588888888@c.us'

    if (!client || !adminPhone) {
      this.logger.warn('No OpenWA client or ADMIN_WHATSAPP_NUMBER configured.');
      return;
    }

    const fileBase64 = fs.readFileSync(filePath, { encoding: 'base64' });
    const dataUri = `data:application/pdf;base64,${fileBase64}`;

    const formattedPhone = adminPhone.includes('@') ? adminPhone : `${adminPhone}@c.us`;

    await client.sendFile(
      formattedPhone as any,
      dataUri,
      'reporte_diario_ia.pdf',
      'Adjunto el reporte consolidado de operaciones y gestión de IA de hoy.'
    );
  }
}
