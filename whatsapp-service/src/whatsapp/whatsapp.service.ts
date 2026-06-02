import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { create, Client, Message } from '@open-wa/wa-automate';
import { AiService } from '../ai/ai.service';
import { SupabaseService } from '../supabase/supabase.service';
import { ExcelService } from '../reports/excel.service';

@Injectable()
export class WhatsappService implements OnModuleInit, OnModuleDestroy {
  private client: Client | null = null;
  private readonly logger = new Logger(WhatsappService.name);
  private currentQrCode: string | null = null;
  private connectionState: string = 'INITIALIZING';

  constructor(
    private readonly aiService: AiService,
    private readonly supabaseService: SupabaseService,
    private readonly excelService: ExcelService,
  ) { }

  async onModuleInit() {
    this.logger.log('Initializing OpenWA Client...');
    try {
      this.client = await create({
        sessionId: 'gmg-cobranzas-bot',
        multiDevice: true,
        authTimeout: 60,
        blockCrashLogs: true,
        disableSpins: true,
        // headless: false shows the Chromium window — useful during first QR scan
        // Set to true once session is saved
        headless: true,
        hostNotificationLang: 'es_AR' as any,
        logConsole: false,
        // popup: false so QR shows in terminal output
        popup: false,
        // qrTimeout: 0 = no timeout, wait indefinitely for QR scan
        qrTimeout: 0,
        qrRefreshS: 15,
        throwErrorOnTosBlock: false,
        useChrome: false,
        catchQR: (qrCode, asciiQR, attempt, urlCode) => {
          this.logger.log(`New QR Code received (Attempt ${attempt})`);
          this.currentQrCode = qrCode;
          this.connectionState = 'WAITING_FOR_QR';
        },
      });

      this.logger.log('✅ OpenWA Client successfully initialized.');
      this.setupListeners();
    } catch (error) {
      this.logger.error('❌ Failed to initialize OpenWA Client', error);
    }
  }

  private setupListeners() {
    if (!this.client) return;

    this.client.onStateChanged((state) => {
      this.logger.log(`WhatsApp state changed: ${state}`);
      this.connectionState = state;
      if (state === 'CONNECTED') {
        this.currentQrCode = null;
      }
      if (state === 'CONFLICT' || state === 'UNLAUNCHED') {
        this.client?.forceRefocus();
      }
    });

    this.client.onMessage(async (message: Message) => {
      await this.handleIncomingMessage(message);
    });
  }

  private async handleIncomingMessage(message: Message) {
    // Only process text messages from users (ignore groups for now)
    if (message.isGroupMsg || message.type !== 'chat') return;

    this.logger.log(`New message from ${message.from}: ${message.body}`);
    const telefono = message.from.replace('@c.us', '');

    try {
      // 1. Analyze with AI
      const aiAnalysis = await this.aiService.analyzeMessage(message.body);
      this.logger.debug(`AI Analysis: ${JSON.stringify(aiAnalysis)}`);

      const supabase = this.supabaseService.getClient();

      // 2. Find client by phone
      const { data: clientes } = await supabase
        .from('clientes')
        .select('*')
        .eq('telefono', telefono);

      const cliente = clientes && clientes.length > 0 ? clientes[0] : null;
      let clienteId = cliente ? cliente.id : null;

      // 3. Upsert conversation
      let conversationId = null;
      const { data: conv } = await supabase
        .from('whatsapp_conversations')
        .select('id')
        .eq('telefono', telefono)
        .eq('estado', 'ABIERTO')
        .single();

      if (conv) {
        conversationId = conv.id;
        await supabase
          .from('whatsapp_conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', conversationId);
      } else {
        const { data: newConv } = await supabase
          .from('whatsapp_conversations')
          .insert({
            telefono,
            cliente_id: clienteId,
          })
          .select()
          .single();
        if (newConv) conversationId = newConv.id;
      }

      // 4. Save message
      if (conversationId) {
        const { data: newMsg } = await supabase
          .from('whatsapp_messages')
          .insert({
            conversation_id: conversationId,
            sender_type: 'CLIENT',
            content: message.body,
            ai_analyzed: true,
            ai_intent: aiAnalysis.intencion,
            ai_risk: aiAnalysis.riesgo_recuperacion,
          })
          .select()
          .single();

        if (newMsg) {
          await supabase.from('ai_analysis_logs').insert({
            message_id: newMsg.id,
            detected_promise: aiAnalysis.promesa_pago,
            detected_followup: aiAnalysis.seguimiento,
            raw_response: aiAnalysis
          });
        }
      }

      // 5. Update client state & create gestion if promise or follow up detected
      if (clienteId && (aiAnalysis.promesa_pago || aiAnalysis.seguimiento)) {
        const resultado = aiAnalysis.promesa_pago ? 'PROMESA DE PAGO' : 'VOLVER A LLAMAR';

        await supabase.from('gestiones').insert({
          cliente_id: clienteId,
          agente_id: cliente.agente_id, // Asignar al mismo agente del cliente
          resultado,
          comentario: `(IA Bot) Detectado: ${aiAnalysis.intencion}`,
          canal: 'whatsapp',
          promesa_pago: aiAnalysis.promesa_pago,
          fecha_promesa: aiAnalysis.fecha_promesa || null,
          monto_promesa: aiAnalysis.monto_promesa || 0,
        });

        // Update client status
        await supabase.from('clientes')
          .update({
            estado: resultado,
            promesa_pago: aiAnalysis.promesa_pago,
            fecha_promesa: aiAnalysis.fecha_promesa || cliente.fecha_promesa,
            monto_promesa: aiAnalysis.monto_promesa || cliente.monto_promesa
          })
          .eq('id', clienteId);
          
        // Sync to Excel template
        await this.excelService.updateClientRow({
          id: clienteId,
          telefono,
          estado: resultado,
          promesa_pago: aiAnalysis.promesa_pago,
          bucket: cliente.bucket,
        });
      }

    } catch (err) {
      this.logger.error('Error handling message', err);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.kill();
    }
  }

  public getClient(): Client | null {
    return this.client;
  }

  public getStatus() {
    return {
      state: this.connectionState,
      qrCode: this.currentQrCode,
    };
  }

  public async restartSession() {
    this.logger.log('Restarting WhatsApp session...');
    if (this.client) {
      await this.client.kill();
      this.client = null;
    }
    this.currentQrCode = null;
    this.connectionState = 'INITIALIZING';
    await this.onModuleInit();
  }
}
