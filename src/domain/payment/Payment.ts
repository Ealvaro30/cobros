import { AggregateRoot } from '../shared/AggregateRoot';
import { Guard } from '../shared/Guard';
import { Money } from '../shared/ValueObjects';

// ============================================
// Tipos de Pago
// ============================================

export type PaymentType = 'TOTAL' | 'PARCIAL' | 'EXTRAORDINARIO';

export type PaymentMethod =
  | 'EFECTIVO'
  | 'TRANSFERENCIA'
  | 'CHEQUE'
  | 'TARJETA'
  | 'DEPOSITO'
  | 'OTRO';

export type PaymentStatus = 'REGISTRADO' | 'CONCILIADO' | 'REVERTIDO';

// ============================================
// Propiedades del Pago
// ============================================

export interface PaymentProps {
  clienteId: string;
  promesaId: string | null;
  acuerdoId: string | null;
  tipo: PaymentType;
  monto: Money;
  metodoPago: PaymentMethod;
  referencia: string | null;
  comprobante: string | null;
  estado: PaymentStatus;
  conciliado: boolean;
  conciliacionFecha: Date | null;
  conciliadoPor: string | null;
  registradoPor: string;
  campanaId: string | null;
  observaciones: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Aggregate Root: Pago
// ============================================

/**
 * Entidad Aggregate Root para Pagos.
 * Modela pagos totales, parciales y extraordinarios con conciliación.
 */
export class Payment extends AggregateRoot<PaymentProps> {
  private constructor(props: PaymentProps, id?: string) {
    super(props, id);
  }

  public static create(params: {
    clienteId: string;
    promesaId?: string;
    acuerdoId?: string;
    tipo: PaymentType;
    monto: number;
    metodoPago: PaymentMethod;
    referencia?: string;
    comprobante?: string;
    registradoPor: string;
    campanaId?: string;
    observaciones?: string;
  }): Payment {
    const guardResult = Guard.combine([
      Guard.againstNullOrUndefined(params.clienteId, 'clienteId'),
      Guard.againstNullOrUndefined(params.registradoPor, 'registradoPor'),
      Guard.greaterThan(params.monto, 0, 'monto'),
      Guard.isOneOf(params.tipo, ['TOTAL', 'PARCIAL', 'EXTRAORDINARIO'], 'tipo'),
    ]);

    if (!guardResult.succeeded) {
      throw new Error(guardResult.message);
    }

    const payment = new Payment({
      clienteId: params.clienteId,
      promesaId: params.promesaId || null,
      acuerdoId: params.acuerdoId || null,
      tipo: params.tipo,
      monto: Money.create(params.monto),
      metodoPago: params.metodoPago,
      referencia: params.referencia || null,
      comprobante: params.comprobante || null,
      estado: 'REGISTRADO',
      conciliado: false,
      conciliacionFecha: null,
      conciliadoPor: null,
      registradoPor: params.registradoPor,
      campanaId: params.campanaId || null,
      observaciones: params.observaciones || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    payment.addDomainEvent('PAYMENT_REGISTERED', {
      clienteId: params.clienteId,
      monto: params.monto,
      tipo: params.tipo,
      metodoPago: params.metodoPago,
      promesaId: params.promesaId,
    });

    return payment;
  }

  public static reconstitute(props: PaymentProps, id: string): Payment {
    return new Payment(props, id);
  }

  // --- Getters ---

  get clienteId(): string { return this.props.clienteId; }
  get promesaId(): string | null { return this.props.promesaId; }
  get acuerdoId(): string | null { return this.props.acuerdoId; }
  get tipo(): PaymentType { return this.props.tipo; }
  get monto(): Money { return this.props.monto; }
  get metodoPago(): PaymentMethod { return this.props.metodoPago; }
  get referencia(): string | null { return this.props.referencia; }
  get comprobante(): string | null { return this.props.comprobante; }
  get estado(): PaymentStatus { return this.props.estado; }
  get conciliado(): boolean { return this.props.conciliado; }
  get conciliacionFecha(): Date | null { return this.props.conciliacionFecha; }
  get conciliadoPor(): string | null { return this.props.conciliadoPor; }
  get registradoPor(): string { return this.props.registradoPor; }
  get campanaId(): string | null { return this.props.campanaId; }
  get observaciones(): string | null { return this.props.observaciones; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  // --- Comportamiento de Negocio ---

  /**
   * Concilia el pago (verificación bancaria/contable).
   */
  public conciliar(conciliadoPor: string): void {
    if (this.props.estado !== 'REGISTRADO') {
      throw new Error(`No se puede conciliar un pago en estado ${this.props.estado}.`);
    }

    this.props.conciliado = true;
    this.props.conciliacionFecha = new Date();
    this.props.conciliadoPor = conciliadoPor;
    this.props.estado = 'CONCILIADO';
    this.props.updatedAt = new Date();

    this.addDomainEvent('PAYMENT_RECONCILED', {
      clienteId: this.props.clienteId,
      monto: this.props.monto.amount,
      conciliadoPor,
    });
  }

  /**
   * Revierte un pago registrado por error.
   */
  public revertir(motivo: string): void {
    if (this.props.estado === 'REVERTIDO') {
      throw new Error('El pago ya fue revertido.');
    }

    this.props.estado = 'REVERTIDO';
    this.props.observaciones = `[REVERTIDO] ${motivo}. Obs. original: ${this.props.observaciones || 'N/A'}`;
    this.props.updatedAt = new Date();

    this.addDomainEvent('PAYMENT_REVERSED', {
      clienteId: this.props.clienteId,
      monto: this.props.monto.amount,
      motivo,
    });
  }

  /**
   * Vincula el pago a una promesa específica.
   */
  public vincularPromesa(promesaId: string): void {
    this.props.promesaId = promesaId;
    this.props.updatedAt = new Date();
  }

  /**
   * Vincula el pago a un acuerdo específico.
   */
  public vincularAcuerdo(acuerdoId: string): void {
    this.props.acuerdoId = acuerdoId;
    this.props.updatedAt = new Date();
  }
}
