import { AggregateRoot } from '../shared/AggregateRoot';
import { Guard } from '../shared/Guard';
import { Money } from '../shared/ValueObjects';
import { AgreementInstallment } from './AgreementInstallment';

export type AgreementStatus = 'PENDIENTE' | 'ACTIVO' | 'CUMPLIDO' | 'INCUMPLIDO' | 'CANCELADO';

export interface AgreementProps {
  clienteId: string;
  agenteId: string;
  montoOriginal: Money;
  montoRefinanciado: Money;
  descuento: Money;
  numeroCuotas: number;
  cuotas: AgreementInstallment[];
  estado: AgreementStatus;
  fechaFirma: Date | null;
  observaciones: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Entidad Aggregate Root de Acuerdos/Convenios de Pago (Refinanciamiento).
 */
export class Agreement extends AggregateRoot<AgreementProps> {
  private constructor(props: AgreementProps, id?: string) {
    super(props, id);
  }

  public static create(params: {
    clienteId: string;
    agenteId: string;
    montoOriginal: number;
    montoRefinanciado: number;
    descuento?: number;
    numeroCuotas: number;
    fechaPrimeraCuota: Date;
    observaciones?: string;
  }): Agreement {
    const desc = params.descuento || 0;
    const guardResult = Guard.combine([
      Guard.againstNullOrUndefined(params.clienteId, 'clienteId'),
      Guard.againstNullOrUndefined(params.agenteId, 'agenteId'),
      Guard.greaterThan(params.montoOriginal, 0, 'montoOriginal'),
      Guard.greaterThan(params.montoRefinanciado, 0, 'montoRefinanciado'),
      Guard.inRange(params.numeroCuotas, 1, 60, 'numeroCuotas'),
    ]);

    if (!guardResult.succeeded) {
      throw new Error(guardResult.message);
    }

    // Generar cuotas automáticas
    const cuotas: AgreementInstallment[] = [];
    const montoCuota = Math.round((params.montoRefinanciado / params.numeroCuotas) * 100) / 100;
    
    for (let i = 1; i <= params.numeroCuotas; i++) {
      const fechaVenc = new Date(params.fechaPrimeraCuota);
      fechaVenc.setMonth(fechaVenc.getMonth() + (i - 1));
      cuotas.push(AgreementInstallment.create({
        numeroCuota: i,
        monto: montoCuota,
        fechaVencimiento: fechaVenc,
      }));
    }

    const agreement = new Agreement({
      clienteId: params.clienteId,
      agenteId: params.agenteId,
      montoOriginal: Money.create(params.montoOriginal),
      montoRefinanciado: Money.create(params.montoRefinanciado),
      descuento: Money.create(desc),
      numeroCuotas: params.numeroCuotas,
      cuotas,
      estado: 'PENDIENTE',
      fechaFirma: null,
      observaciones: params.observaciones || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    agreement.addDomainEvent('AGREEMENT_CREATED', {
      clienteId: params.clienteId,
      montoRefinanciado: params.montoRefinanciado,
      numeroCuotas: params.numeroCuotas,
    });

    return agreement;
  }

  public static reconstitute(props: AgreementProps, id: string): Agreement {
    return new Agreement(props, id);
  }

  // --- Getters ---
  get clienteId(): string { return this.props.clienteId; }
  get agenteId(): string { return this.props.agenteId; }
  get montoOriginal(): Money { return this.props.montoOriginal; }
  get montoRefinanciado(): Money { return this.props.montoRefinanciado; }
  get descuento(): Money { return this.props.descuento; }
  get numeroCuotas(): number { return this.props.numeroCuotas; }
  get cuotas(): ReadonlyArray<AgreementInstallment> { return this.props.cuotas; }
  get estado(): AgreementStatus { return this.props.estado; }
  get fechaFirma(): Date | null { return this.props.fechaFirma; }
  get observaciones(): string | null { return this.props.observaciones; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  // --- Lógica de Negocio ---
  public firmar(): void {
    if (this.props.estado !== 'PENDIENTE') {
      throw new Error(`No se puede firmar un acuerdo en estado ${this.props.estado}.`);
    }
    this.props.estado = 'ACTIVO';
    this.props.fechaFirma = new Date();
    this.props.updatedAt = new Date();
  }

  public pagarCuota(numeroCuota: number, fechaPago: Date): void {
    if (this.props.estado !== 'ACTIVO') {
      throw new Error(`Solo se pueden pagar cuotas de acuerdos activos. Estado actual: ${this.props.estado}`);
    }

    const cuota = this.props.cuotas.find(c => c.numeroCuota === numeroCuota);
    if (!cuota) {
      throw new Error(`No existe la cuota #${numeroCuota} en este acuerdo.`);
    }

    cuota.pagar(fechaPago);

    // Si todas las cuotas están pagadas, marcar el acuerdo como cumplido
    const todasPagadas = this.props.cuotas.every(c => c.estado === 'PAGADA');
    if (todasPagadas) {
      this.props.estado = 'CUMPLIDO';
      this.addDomainEvent('AGREEMENT_COMPLETED', {
        clienteId: this.props.clienteId,
        montoTotal: this.props.montoRefinanciado.amount,
      });
    }

    this.props.updatedAt = new Date();
  }

  public verificarVencimientos(): void {
    if (this.props.estado !== 'ACTIVO') return;

    let tieneCuotaVencida = false;
    for (const cuota of this.props.cuotas) {
      cuota.marcarVencida();
      if (cuota.estado === 'VENCIDA') {
        tieneCuotaVencida = true;
      }
    }

    if (tieneCuotaVencida) {
      this.props.estado = 'INCUMPLIDO';
      this.addDomainEvent('AGREEMENT_DEFAULTED', {
        clienteId: this.props.clienteId,
        montoPendiente: this.props.montoRefinanciado.amount,
      });
      this.props.updatedAt = new Date();
    }
  }

  public cancelar(motivo: string): void {
    if (this.props.estado === 'CUMPLIDO') {
      throw new Error('No se puede cancelar un acuerdo ya cumplido.');
    }
    this.props.estado = 'CANCELADA' as any;
    this.props.observaciones = motivo;
    this.props.updatedAt = new Date();
  }
}
