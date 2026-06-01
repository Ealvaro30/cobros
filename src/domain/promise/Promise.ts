import { AggregateRoot } from '../shared/AggregateRoot';
import { Guard } from '../shared/Guard';
import { Money } from '../shared/ValueObjects';

// ============================================
// Tipos de Promesa
// ============================================

export type PromiseType = 'TOTAL' | 'PARCIAL' | 'CUOTAS';

export type PromiseStatus =
  | 'PENDIENTE'
  | 'CUMPLIDA'
  | 'INCUMPLIDA'
  | 'REPROGRAMADA'
  | 'CANCELADA';

// ============================================
// Propiedades de la Promesa
// ============================================

export interface PromiseProps {
  clienteId: string;
  agenteId: string;
  tipo: PromiseType;
  monto: Money;
  montoPagado: Money;
  fechaVencimiento: Date;
  fechaOriginal: Date;
  estado: PromiseStatus;
  numeroCuotas: number;
  cuotaActual: number;
  montoCuota: Money;
  observaciones: string | null;
  recordatorioEnviado: boolean;
  reprogramaciones: number;
  campanaId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Aggregate Root: Promesa de Pago
// ============================================

/**
 * Entidad Aggregate Root para Promesas de Pago.
 * Modela el lifecycle completo: PENDIENTE → CUMPLIDA/INCUMPLIDA/REPROGRAMADA.
 * Incluye lógica de vencimiento automático, recordatorios, y reagendamiento.
 */
export class PaymentPromise extends AggregateRoot<PromiseProps> {
  private constructor(props: PromiseProps, id?: string) {
    super(props, id);
  }

  // --- Factory Methods ---

  public static createTotal(params: {
    clienteId: string;
    agenteId: string;
    monto: number;
    fechaVencimiento: Date;
    campanaId?: string;
    observaciones?: string;
  }): PaymentPromise {
    const guardResult = Guard.combine([
      Guard.againstNullOrUndefined(params.clienteId, 'clienteId'),
      Guard.againstNullOrUndefined(params.agenteId, 'agenteId'),
      Guard.greaterThan(params.monto, 0, 'monto'),
      Guard.isNotPastDate(params.fechaVencimiento, 'fechaVencimiento'),
    ]);

    if (!guardResult.succeeded) {
      throw new Error(guardResult.message);
    }

    const promise = new PaymentPromise({
      clienteId: params.clienteId,
      agenteId: params.agenteId,
      tipo: 'TOTAL',
      monto: Money.create(params.monto),
      montoPagado: Money.create(0),
      fechaVencimiento: params.fechaVencimiento,
      fechaOriginal: params.fechaVencimiento,
      estado: 'PENDIENTE',
      numeroCuotas: 1,
      cuotaActual: 1,
      montoCuota: Money.create(params.monto),
      observaciones: params.observaciones || null,
      recordatorioEnviado: false,
      reprogramaciones: 0,
      campanaId: params.campanaId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    promise.addDomainEvent('PROMISE_CREATED', {
      clienteId: params.clienteId,
      tipo: 'TOTAL',
      monto: params.monto,
      fechaVencimiento: params.fechaVencimiento.toISOString(),
    });

    return promise;
  }

  public static createParcial(params: {
    clienteId: string;
    agenteId: string;
    monto: number;
    fechaVencimiento: Date;
    campanaId?: string;
    observaciones?: string;
  }): PaymentPromise {
    const guardResult = Guard.combine([
      Guard.againstNullOrUndefined(params.clienteId, 'clienteId'),
      Guard.greaterThan(params.monto, 0, 'monto'),
    ]);

    if (!guardResult.succeeded) {
      throw new Error(guardResult.message);
    }

    const promise = new PaymentPromise({
      clienteId: params.clienteId,
      agenteId: params.agenteId,
      tipo: 'PARCIAL',
      monto: Money.create(params.monto),
      montoPagado: Money.create(0),
      fechaVencimiento: params.fechaVencimiento,
      fechaOriginal: params.fechaVencimiento,
      estado: 'PENDIENTE',
      numeroCuotas: 1,
      cuotaActual: 1,
      montoCuota: Money.create(params.monto),
      observaciones: params.observaciones || null,
      recordatorioEnviado: false,
      reprogramaciones: 0,
      campanaId: params.campanaId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    promise.addDomainEvent('PROMISE_CREATED', {
      clienteId: params.clienteId,
      tipo: 'PARCIAL',
      monto: params.monto,
    });

    return promise;
  }

  public static createCuotas(params: {
    clienteId: string;
    agenteId: string;
    montoTotal: number;
    numeroCuotas: number;
    fechaPrimeraCuota: Date;
    campanaId?: string;
    observaciones?: string;
  }): PaymentPromise {
    const guardResult = Guard.combine([
      Guard.againstNullOrUndefined(params.clienteId, 'clienteId'),
      Guard.greaterThan(params.montoTotal, 0, 'montoTotal'),
      Guard.inRange(params.numeroCuotas, 2, 60, 'numeroCuotas'),
    ]);

    if (!guardResult.succeeded) {
      throw new Error(guardResult.message);
    }

    const montoCuota = Math.round((params.montoTotal / params.numeroCuotas) * 100) / 100;

    const promise = new PaymentPromise({
      clienteId: params.clienteId,
      agenteId: params.agenteId,
      tipo: 'CUOTAS',
      monto: Money.create(params.montoTotal),
      montoPagado: Money.create(0),
      fechaVencimiento: params.fechaPrimeraCuota,
      fechaOriginal: params.fechaPrimeraCuota,
      estado: 'PENDIENTE',
      numeroCuotas: params.numeroCuotas,
      cuotaActual: 1,
      montoCuota: Money.create(montoCuota),
      observaciones: params.observaciones || null,
      recordatorioEnviado: false,
      reprogramaciones: 0,
      campanaId: params.campanaId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    promise.addDomainEvent('PROMISE_CREATED', {
      clienteId: params.clienteId,
      tipo: 'CUOTAS',
      montoTotal: params.montoTotal,
      numeroCuotas: params.numeroCuotas,
    });

    return promise;
  }

  /**
   * Reconstrucción desde persistencia (sin validaciones de creación).
   */
  public static reconstitute(props: PromiseProps, id: string): PaymentPromise {
    return new PaymentPromise(props, id);
  }

  // --- Getters ---

  get clienteId(): string { return this.props.clienteId; }
  get agenteId(): string { return this.props.agenteId; }
  get tipo(): PromiseType { return this.props.tipo; }
  get monto(): Money { return this.props.monto; }
  get montoPagado(): Money { return this.props.montoPagado; }
  get fechaVencimiento(): Date { return this.props.fechaVencimiento; }
  get fechaOriginal(): Date { return this.props.fechaOriginal; }
  get estado(): PromiseStatus { return this.props.estado; }
  get numeroCuotas(): number { return this.props.numeroCuotas; }
  get cuotaActual(): number { return this.props.cuotaActual; }
  get montoCuota(): Money { return this.props.montoCuota; }
  get observaciones(): string | null { return this.props.observaciones; }
  get recordatorioEnviado(): boolean { return this.props.recordatorioEnviado; }
  get reprogramaciones(): number { return this.props.reprogramaciones; }
  get campanaId(): string | null { return this.props.campanaId; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  // --- Propiedades Calculadas ---

  get saldoPendiente(): Money {
    return this.props.monto.subtract(this.props.montoPagado);
  }

  get porcentajeCumplido(): number {
    if (this.props.monto.amount === 0) return 0;
    return Math.round((this.props.montoPagado.amount / this.props.monto.amount) * 100);
  }

  get estaVencida(): boolean {
    return this.props.estado === 'PENDIENTE' && new Date() > this.props.fechaVencimiento;
  }

  get diasRestantes(): number {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const venc = new Date(this.props.fechaVencimiento);
    venc.setHours(0, 0, 0, 0);
    return Math.ceil((venc.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  // --- Comportamiento de Negocio ---

  /**
   * Marca la promesa como cumplida (pago total recibido).
   */
  public cumplir(montoPagado: number): void {
    if (this.props.estado !== 'PENDIENTE') {
      throw new Error(`No se puede cumplir una promesa en estado ${this.props.estado}.`);
    }

    this.props.montoPagado = Money.create(montoPagado);
    this.props.estado = 'CUMPLIDA';
    this.props.updatedAt = new Date();

    this.addDomainEvent('PROMISE_FULFILLED', {
      clienteId: this.props.clienteId,
      monto: montoPagado,
      tipo: this.props.tipo,
    });
  }

  /**
   * Marca la promesa como incumplida (venció sin pago).
   */
  public incumplir(): void {
    if (this.props.estado !== 'PENDIENTE') {
      throw new Error(`No se puede incumplir una promesa en estado ${this.props.estado}.`);
    }

    this.props.estado = 'INCUMPLIDA';
    this.props.updatedAt = new Date();

    this.addDomainEvent('PROMISE_BROKEN', {
      clienteId: this.props.clienteId,
      monto: this.props.monto.amount,
      tipo: this.props.tipo,
    });
  }

  /**
   * Reprograma la promesa a una nueva fecha.
   */
  public reprogramar(nuevaFecha: Date, observacion?: string): void {
    if (this.props.estado !== 'PENDIENTE' && this.props.estado !== 'INCUMPLIDA') {
      throw new Error(`No se puede reprogramar una promesa en estado ${this.props.estado}.`);
    }

    const guardResult = Guard.isNotPastDate(nuevaFecha, 'nuevaFecha');
    if (!guardResult.succeeded) {
      throw new Error(guardResult.message);
    }

    this.props.fechaVencimiento = nuevaFecha;
    this.props.estado = 'PENDIENTE';
    this.props.recordatorioEnviado = false;
    this.props.reprogramaciones += 1;
    if (observacion) {
      this.props.observaciones = observacion;
    }
    this.props.updatedAt = new Date();

    this.addDomainEvent('PROMISE_RESCHEDULED', {
      clienteId: this.props.clienteId,
      nuevaFecha: nuevaFecha.toISOString(),
      reprogramaciones: this.props.reprogramaciones,
    });
  }

  /**
   * Registra un pago parcial contra la promesa de cuotas.
   */
  public registrarPagoCuota(montoPagado: number): void {
    if (this.props.estado !== 'PENDIENTE') {
      throw new Error('Solo se puede pagar una promesa pendiente.');
    }

    this.props.montoPagado = this.props.montoPagado.add(Money.create(montoPagado));

    if (this.props.montoPagado.amount >= this.props.monto.amount) {
      this.props.estado = 'CUMPLIDA';
      this.addDomainEvent('PROMISE_FULFILLED', {
        clienteId: this.props.clienteId,
        monto: this.props.montoPagado.amount,
        tipo: 'CUOTAS',
      });
    } else if (this.props.tipo === 'CUOTAS') {
      this.props.cuotaActual += 1;
      // Avanzar vencimiento al siguiente mes
      const nextDue = new Date(this.props.fechaVencimiento);
      nextDue.setMonth(nextDue.getMonth() + 1);
      this.props.fechaVencimiento = nextDue;
      this.props.recordatorioEnviado = false;
    }

    this.props.updatedAt = new Date();
  }

  /**
   * Marca el recordatorio como enviado.
   */
  public marcarRecordatorioEnviado(): void {
    this.props.recordatorioEnviado = true;
    this.props.updatedAt = new Date();
  }

  /**
   * Cancela la promesa.
   */
  public cancelar(motivo?: string): void {
    if (this.props.estado === 'CUMPLIDA') {
      throw new Error('No se puede cancelar una promesa ya cumplida.');
    }
    this.props.estado = 'CANCELADA';
    if (motivo) {
      this.props.observaciones = motivo;
    }
    this.props.updatedAt = new Date();
  }
}
