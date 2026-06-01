/**
 * Sistema de Eventos de Dominio (DDD Domain Events).
 * Permite comunicación desacoplada entre Aggregates y módulos.
 */

// ============================================
// Interfaz base de evento de dominio
// ============================================

export interface IDomainEvent {
  readonly eventType: DomainEventType;
  readonly aggregateId: string;
  readonly occurredOn: Date;
  readonly payload: Record<string, unknown>;
  readonly metadata?: {
    userId?: string;
    correlationId?: string;
    causationId?: string;
    ip?: string;
    userAgent?: string;
  };
}

// ============================================
// Tipos de eventos del dominio
// ============================================

export type DomainEventType =
  // Clientes
  | 'CLIENT_CREATED'
  | 'CLIENT_UPDATED'
  | 'CLIENT_ASSIGNED'
  | 'CLIENT_STATUS_CHANGED'
  | 'CLIENT_SCORE_UPDATED'
  // Promesas
  | 'PROMISE_CREATED'
  | 'PROMISE_FULFILLED'
  | 'PROMISE_BROKEN'
  | 'PROMISE_RESCHEDULED'
  | 'PROMISE_EXPIRING'
  // Pagos
  | 'PAYMENT_REGISTERED'
  | 'PAYMENT_RECONCILED'
  | 'PAYMENT_REVERSED'
  // Campañas
  | 'CAMPAIGN_CREATED'
  | 'CAMPAIGN_CLOSED'
  | 'CAMPAIGN_GOAL_REACHED'
  // Gestiones
  | 'GESTION_CREATED'
  | 'GESTION_BATCH_COMPLETED'
  // Acuerdos
  | 'AGREEMENT_CREATED'
  | 'AGREEMENT_INSTALLMENT_DUE'
  | 'AGREEMENT_COMPLETED'
  | 'AGREEMENT_DEFAULTED'
  // Tareas
  | 'TASK_CREATED'
  | 'TASK_COMPLETED'
  | 'TASK_OVERDUE'
  // Legal
  | 'LEGAL_CASE_CREATED'
  | 'LEGAL_STATUS_CHANGED'
  // Comunicaciones
  | 'WHATSAPP_SENT'
  | 'WHATSAPP_RECEIVED'
  | 'EMAIL_SENT'
  | 'SMS_SENT'
  // Notificaciones
  | 'NOTIFICATION_CREATED'
  | 'NOTIFICATION_READ'
  // Documentos
  | 'DOCUMENT_UPLOADED'
  | 'DOCUMENT_DELETED'
  // Automatizaciones
  | 'AUTOMATION_TRIGGERED'
  | 'AUTOMATION_EXECUTED'
  | 'AUTOMATION_FAILED'
  // IA
  | 'SCORING_CALCULATED'
  | 'COPILOT_RECOMMENDATION'
  | 'EXECUTIVE_SUMMARY_GENERATED'
  // Sistema
  | 'IMPORT_COMPLETED'
  | 'DISTRIBUTION_EXECUTED'
  | 'SLA_VIOLATED'
  | 'BACKUP_COMPLETED';

// ============================================
// Clase concreta de evento de dominio
// ============================================

export class DomainEvent implements IDomainEvent {
  public readonly eventType: DomainEventType;
  public readonly aggregateId: string;
  public readonly occurredOn: Date;
  public readonly payload: Record<string, unknown>;
  public readonly metadata?: IDomainEvent['metadata'];

  constructor(
    eventType: DomainEventType,
    aggregateId: string,
    payload: Record<string, unknown>,
    metadata?: IDomainEvent['metadata']
  ) {
    this.eventType = eventType;
    this.aggregateId = aggregateId;
    this.occurredOn = new Date();
    this.payload = Object.freeze({ ...payload });
    this.metadata = metadata ? Object.freeze({ ...metadata }) : undefined;
  }
}

// ============================================
// Interfaz de handler de eventos
// ============================================

export interface IEventHandler<T extends IDomainEvent = IDomainEvent> {
  handle(event: T): Promise<void>;
}

// ============================================
// Event Bus — Registro y despacho de eventos
// ============================================

export type EventHandlerFn = (event: IDomainEvent) => Promise<void>;

export class EventBus {
  private static instance: EventBus;
  private handlers: Map<DomainEventType, EventHandlerFn[]> = new Map();
  private eventLog: IDomainEvent[] = [];
  private maxLogSize = 1000;

  private constructor() {}

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * Registra un handler para un tipo de evento específico.
   */
  public subscribe(eventType: DomainEventType, handler: EventHandlerFn): () => void {
    const existing = this.handlers.get(eventType) || [];
    existing.push(handler);
    this.handlers.set(eventType, existing);

    // Retorna función de unsubscribe
    return () => {
      const handlers = this.handlers.get(eventType) || [];
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    };
  }

  /**
   * Publica un evento a todos los handlers registrados.
   */
  public async publish(event: IDomainEvent): Promise<void> {
    // Guardar en log interno
    this.eventLog.push(event);
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog = this.eventLog.slice(-this.maxLogSize);
    }

    const handlers = this.handlers.get(event.eventType) || [];

    // Ejecutar todos los handlers en paralelo
    const results = await Promise.allSettled(
      handlers.map((handler) => handler(event))
    );

    // Log errores de handlers
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(
          `[EventBus] Error en handler ${index} para evento ${event.eventType}:`,
          result.reason
        );
      }
    });
  }

  /**
   * Publica múltiples eventos en orden secuencial.
   */
  public async publishAll(events: IDomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  /**
   * Obtiene los últimos N eventos del log.
   */
  public getRecentEvents(count: number = 50): IDomainEvent[] {
    return this.eventLog.slice(-count);
  }

  /**
   * Obtiene los eventos de un aggregate específico.
   */
  public getEventsForAggregate(aggregateId: string): IDomainEvent[] {
    return this.eventLog.filter((e) => e.aggregateId === aggregateId);
  }

  /**
   * Limpia todos los handlers (útil en tests).
   */
  public clearAllHandlers(): void {
    this.handlers.clear();
  }

  /**
   * Limpia el log de eventos.
   */
  public clearEventLog(): void {
    this.eventLog = [];
  }
}
