import { Money } from '../shared/ValueObjects';
import { Guard } from '../shared/Guard';

export type InstallmentStatus = 'PENDIENTE' | 'PAGADA' | 'VENCIDA';

export interface AgreementInstallmentProps {
  numeroCuota: number;
  monto: Money;
  fechaVencimiento: Date;
  estado: InstallmentStatus;
  fechaPago: Date | null;
}

/**
 * Value Object/Sub-entidad para Cuotas de un Acuerdo de Pago.
 */
export class AgreementInstallment {
  private props: AgreementInstallmentProps;

  private constructor(props: AgreementInstallmentProps) {
    this.props = props;
  }

  public static create(params: {
    numeroCuota: number;
    monto: number;
    fechaVencimiento: Date;
  }): AgreementInstallment {
    const guardResult = Guard.combine([
      Guard.greaterThan(params.numeroCuota, 0, 'numeroCuota'),
      Guard.greaterThan(params.monto, 0, 'monto'),
    ]);

    if (!guardResult.succeeded) {
      throw new Error(guardResult.message);
    }

    return new AgreementInstallment({
      numeroCuota: params.numeroCuota,
      monto: Money.create(params.monto),
      fechaVencimiento: params.fechaVencimiento,
      estado: 'PENDIENTE',
      fechaPago: null,
    });
  }

  public static reconstitute(props: AgreementInstallmentProps): AgreementInstallment {
    return new AgreementInstallment(props);
  }

  // --- Getters ---
  get numeroCuota(): number { return this.props.numeroCuota; }
  get monto(): Money { return this.props.monto; }
  get fechaVencimiento(): Date { return this.props.fechaVencimiento; }
  get estado(): InstallmentStatus { return this.props.estado; }
  get fechaPago(): Date | null { return this.props.fechaPago; }

  // --- Lógica ---
  public pagar(fechaPago: Date): void {
    if (this.props.estado === 'PAGADA') {
      throw new Error(`La cuota #${this.props.numeroCuota} ya está pagada.`);
    }
    this.props.estado = 'PAGADA';
    this.props.fechaPago = fechaPago;
  }

  public marcarVencida(): void {
    if (this.props.estado === 'PENDIENTE' && new Date() > this.props.fechaVencimiento) {
      this.props.estado = 'VENCIDA';
    }
  }
}
