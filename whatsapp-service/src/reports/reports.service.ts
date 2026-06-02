import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { ExcelService } from './excel.service';
import { PdfService } from './pdf.service';
import * as fs from 'fs';
import { format } from 'date-fns';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly whatsappService: WhatsappService,
    private readonly excelService: ExcelService,
    private readonly pdfService: PdfService,
  ) { }

  public async generateDailyReport() {
    this.logger.log('Starting End of Day Report Generation...');
    try {
      const supabase = this.supabaseService.getClient();

      // 1. Fetch Config
      const { data: config } = await supabase
        .from('whatsapp_config')
        .select('*')
        .eq('is_active', true)
        .single();

      if (!config) {
        this.logger.warn('WhatsApp configuration not found or disabled. Skipping report.');
        return;
      }

      // 2. Fetch Recipients
      const { data: recipients } = await supabase
        .from('whatsapp_report_recipients')
        .select('phone_number, name')
        .eq('is_active', true);

      if (!recipients || recipients.length === 0) {
        this.logger.warn('No active recipients found. Skipping report.');
        return;
      }

      // 3. Gather Stats
      const stats = await this.gatherStats();

      // 4. Generate PDF
      let pdfPath: string | null = null;
      if (config.send_pdf) {
        pdfPath = await this.pdfService.generateSummaryPdf(stats);
      }

      // 5. Excel path
      const excelPath = this.excelService.getExcelPath();

      // 6. Generate Summary Text
      const summaryText = this.buildSummaryText(stats);

      // 7. Send via WhatsApp
      const client = this.whatsappService.getClient();
      if (!client) {
        this.logger.error('WhatsApp client not connected. Cannot send reports.');
        return;
      }

      for (const recipient of recipients) {
        const phone = recipient.phone_number;
        const formattedPhone = phone.includes('@') ? phone : `${phone}@c.us`;

        try {
          if (config.send_summary) {
            await client.sendText(formattedPhone as any, summaryText);
          }

          if (config.send_pdf && pdfPath) {
            const pdfBase64 = fs.readFileSync(pdfPath, { encoding: 'base64' });
            const dataUri = `data:application/pdf;base64,${pdfBase64}`;
            await client.sendFile(formattedPhone as any, dataUri, 'Reporte_Diario.pdf', 'Reporte PDF');
          }

          if (config.send_excel && fs.existsSync(excelPath)) {
            const excelBase64 = fs.readFileSync(excelPath, { encoding: 'base64' });
            const dataUri = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${excelBase64}`;
            await client.sendFile(formattedPhone as any, dataUri, 'Plantilla_Clientes_Actualizada.xlsx', 'Reporte Excel Original');
          }

          this.logger.log(`Report sent to ${recipient.name} (${phone})`);
          
          await supabase.from('whatsapp_logs').insert({
            from_number: 'BOT',
            to_number: phone,
            message_type: 'REPORT',
            status: 'SUCCESS'
          });

        } catch (sendErr) {
          this.logger.error(`Error sending report to ${phone}: ${sendErr}`);
          await supabase.from('whatsapp_logs').insert({
            from_number: 'BOT',
            to_number: phone,
            message_type: 'REPORT',
            status: 'ERROR',
            error_detail: (sendErr as Error).message
          });
        }
      }

    } catch (err) {
      this.logger.error('Failed to generate daily report', err);
    }
  }

  private async gatherStats() {
    const supabase = this.supabaseService.getClient();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats: any = {
      gestionados: 0,
      salvados: 0,
      pendientes: 0,
      promesas: 0,
      promesasVencidas: 0,
      sinRespuesta: 0,
      rechazos: 0,
      buckets: {},
      agentes: []
    };

    // Get today's gestiones
    const { data: gestiones } = await supabase
      .from('gestiones')
      .select('resultado')
      .gte('fecha', today.toISOString());

    if (gestiones) {
      stats.gestionados = gestiones.length;
      stats.promesas = gestiones.filter((g: any) => g.resultado === 'PROMESA DE PAGO').length;
      stats.sinRespuesta = gestiones.filter((g: any) => g.resultado === 'NO CONTESTA' || g.resultado === 'BUZON').length;
      stats.rechazos = gestiones.filter((g: any) => g.resultado === 'NEGATIVA DE PAGO').length;
    }

    // Get clients states for buckets, pendientes, etc
    const { data: clientes } = await supabase
      .from('clientes')
      .select('estado, bucket, agente_id');

    if (clientes) {
      stats.salvados = clientes.filter((c: any) => c.estado === 'PAGADO').length;
      stats.pendientes = clientes.filter((c: any) => c.estado === 'SIN GESTION').length;

      clientes.forEach((c: any) => {
        if (c.bucket) {
          stats.buckets[c.bucket] = (stats.buckets[c.bucket] || 0) + 1;
        }
      });
    }

    // Get Agent stats
    const { data: agentsData } = await supabase
      .from('perfiles')
      .select('id, nombre_completo');
      
    if (agentsData && gestiones) {
        // A full SQL query with grouping would be better, but we can aggregate here
        const { data: agentGestiones } = await supabase
          .from('gestiones')
          .select('agente_id')
          .gte('fecha', today.toISOString());
          
        if(agentGestiones) {
          const agentCounts: any = {};
          agentGestiones.forEach((g: any) => {
            if(g.agente_id) {
               agentCounts[g.agente_id] = (agentCounts[g.agente_id] || 0) + 1;
            }
          });
          
          for (const agentId of Object.keys(agentCounts)) {
             const agent = agentsData.find((a: any) => a.id === agentId);
             if(agent) {
               stats.agentes.push({
                 nombre: agent.nombre_completo,
                 count: agentCounts[agentId]
               });
             }
          }
        }
    }

    return stats;
  }

  private buildSummaryText(stats: any): string {
    const dateStr = format(new Date(), 'dd/MM/yyyy');
    
    let text = `══════════════════════\n`;
    text += `*REPORTE FIN DEL DÍA*\n`;
    text += `══════════════════════\n\n`;
    text += `Fecha: ${dateStr}\n\n`;
    text += `Clientes Gestionados: ${stats.gestionados}\n`;
    text += `Promesas: ${stats.promesas}\n`;
    text += `Salvados: ${stats.salvados}\n`;
    text += `Pendientes: ${stats.pendientes}\n\n`;

    for (const [bucket, count] of Object.entries(stats.buckets)) {
      text += `${bucket}: ${count}\n`;
    }

    text += `\n`;

    let bestAgent = '';
    let maxCount = -1;
    for (const ag of stats.agentes) {
      if (ag.count > maxCount) {
        maxCount = ag.count;
        bestAgent = ag.nombre;
      }
    }

    if (bestAgent) {
      text += `*Agente más productivo:*\n${bestAgent}\n\n`;
    }
    
    text += `══════════════════════`;
    return text;
  }
}
