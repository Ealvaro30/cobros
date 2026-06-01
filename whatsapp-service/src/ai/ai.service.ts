import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../config/config.service';
import Anthropic from '@anthropic-ai/sdk';

export interface AnalysisResult {
  promesa_pago: boolean;
  fecha_promesa?: string | null;
  monto_promesa?: number | null;
  seguimiento: boolean;
  intencion: string;
  riesgo_recuperacion: string;
}

@Injectable()
export class AiService {
  private anthropic!: Anthropic;
  private readonly logger = new Logger(AiService.name);

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get('ANTHROPIC_API_KEY');
    if (apiKey) {
      this.anthropic = new Anthropic({ apiKey });
      this.logger.log('Anthropic AI Client initialized');
    } else {
      this.logger.warn('ANTHROPIC_API_KEY not provided');
    }
  }

  async analyzeMessage(message: string): Promise<AnalysisResult> {
    if (!this.anthropic) {
      return {
        promesa_pago: false,
        seguimiento: false,
        intencion: 'Desconocido',
        riesgo_recuperacion: 'Medio',
      };
    }

    const prompt = `
    Analiza el siguiente mensaje de WhatsApp de un cliente en cobranza.
    Tu objetivo es extraer información clave para el CRM.
    
    Mensaje del cliente: "${message}"

    Responde ÚNICAMENTE en formato JSON válido con las siguientes claves:
    - promesa_pago: boolean (true si el cliente promete pagar, pide "chance", "esperar al viernes", etc.)
    - fecha_promesa: string (formato YYYY-MM-DD si logras inferir la fecha exacta, o null si no se menciona)
    - monto_promesa: number (monto numérico si se menciona, null si no)
    - seguimiento: boolean (true si el cliente pide que le llamen después, está evasivo, indeciso, o pide tiempo)
    - intencion: string (Breve descripción de la intención del cliente, ej: "Solicita prórroga", "Promesa de pago", "Rechaza deuda")
    - riesgo_recuperacion: string ("ALTO", "MEDIO", "BAJO")
    `;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}') + 1;
      const jsonStr = text.slice(jsonStart, jsonEnd);
      
      return JSON.parse(jsonStr) as AnalysisResult;
    } catch (error) {
      this.logger.error('Error analyzing message with AI', error);
      throw error;
    }
  }
}
