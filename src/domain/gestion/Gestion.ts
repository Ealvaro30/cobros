import { Entity } from '../shared/Entity';
import { Money } from '../shared/ValueObjects';
import { EstadoCliente } from '../client/Client';

export type CanalGestion = 'llamada' | 'whatsapp' | 'sms' | 'email';

export interface GestionProps {
  clienteId: string;
  agenteId: string;
  comentario: string;
  resultado: EstadoCliente;
  fecha: Date;
  promesaPago: boolean;
  fechaPromesa: Date | null;
  montoPromesa: Money;
  canal: CanalGestion;
  createdAt?: Date;
}

/**
 * Entidad Gestión (DDD Aggregate Root).
 * Representa una interacción de cobranza registrada por un agente sobre un cliente.
 */
export class Gestion extends Entity<GestionProps> {
  private constructor(props: GestionProps, id?: string) {
    super(props, id);
  }

  /**
   * Factory Method para instanciar una Gestión con validación de promesas y canales.
   */
  public static create(props: GestionProps, id?: string): Gestion {
    if (!props.clienteId) {
      throw new Error('El ID del cliente es obligatorio para registrar una gestión.');
    }
    if (!props.agenteId) {
      throw new Error('El ID del agente es obligatorio para registrar una gestión.');
    }
    if (!props.comentario || props.comentario.trim() === '') {
      throw new Error('El comentario de la gestión no puede estar vacío.');
    }

    // Validación de integridad de promesas de pago
    if (props.promesaPago) {
      if (props.montoPromesa.amount <= 0) {
        throw new Error('El monto de la promesa de pago debe ser superior a cero.');
      }
      if (!props.fechaPromesa) {
        throw new Error('La fecha de la promesa de pago es obligatoria si hay promesa.');
      }
      if (props.fechaPromesa < new Date(new Date().setHours(0,0,0,0))) {
        throw new Error('La fecha de la promesa de pago no puede ser del pasado.');
      }
    }

    return new Gestion(
      {
        ...props,
        fecha: props.fecha || new Date(),
        createdAt: props.createdAt || new Date(),
      },
      id
    );
  }

  // --- Getters de Propiedades ---
  get clienteId(): string { return this.props.clienteId; }
  get agenteId(): string { return this.props.agenteId; }
  get comentario(): string { return this.props.comentario; }
  get resultado(): EstadoCliente { return this.props.resultado; }
  get fecha(): Date { return this.props.fecha; }
  get promesaPago(): boolean { return this.props.promesaPago; }
  get fechaPromesa(): Date | null { return this.props.fechaPromesa; }
  get montoPromesa(): Money { return this.props.montoPromesa; }
  get canal(): CanalGestion { return this.props.canal; }
  get createdAt(): Date | undefined { return this.props.createdAt; }
}
