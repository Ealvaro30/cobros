import { Entity } from '../shared/Entity';
import { Money } from '../shared/ValueObjects';

export type EstadoCampana = 'activa' | 'cerrada' | 'planificada';

export interface CampaignProps {
  nombre: string;
  mes: number;
  anio: number;
  estado: EstadoCampana;
  metaBucket5: Money;
  metaBucket6: Money;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Entidad Agregada Campaña (DDD Aggregate Root).
 * Modela un período de cobranza (usualmente mensual) y sus metas financieras de recuperación.
 */
export class Campaign extends Entity<CampaignProps> {
  private constructor(props: CampaignProps, id?: string) {
    super(props, id);
  }

  /**
   * Factory Method para instanciar una Campaña con validación estricta de periodo.
   */
  public static create(props: CampaignProps, id?: string): Campaign {
    if (!props.nombre || props.nombre.trim() === '') {
      throw new Error('El nombre de la campaña es obligatorio.');
    }
    if (props.mes < 1 || props.mes > 12) {
      throw new Error('El mes debe ser un valor entero comprendido entre 1 y 12.');
    }
    if (props.anio < 2020) {
      throw new Error('El año de la campaña debe ser igual o superior a 2020.');
    }

    return new Campaign(
      {
        ...props,
        createdAt: props.createdAt || new Date(),
        updatedAt: props.updatedAt || new Date(),
      },
      id
    );
  }

  // --- Getters de Propiedades ---
  get nombre(): string { return this.props.nombre; }
  get mes(): number { return this.props.mes; }
  get anio(): number { return this.props.anio; }
  get estado(): EstadoCampana { return this.props.estado; }
  get metaBucket5(): Money { return this.props.metaBucket5; }
  get metaBucket6(): Money { return this.props.metaBucket6; }
  get createdAt(): Date | undefined { return this.props.createdAt; }
  get updatedAt(): Date | undefined { return this.props.updatedAt; }

  // --- Métodos de Comportamiento ---

  /**
   * Cambia el estado de la campaña respetando las transiciones válidas.
   */
  public cambiarEstado(nuevoEstado: EstadoCampana): void {
    if (this.props.estado === 'cerrada' && nuevoEstado !== 'cerrada') {
      throw new Error('No se puede volver a abrir una campaña que ya ha sido cerrada.');
    }
    this.props.estado = nuevoEstado;
    this.props.updatedAt = new Date();
  }

  /**
   * Actualiza las metas financieras de recuperación asignadas a cada bucket.
   */
  public actualizarMetas(meta5: Money, meta6: Money): void {
    if (meta5.amount < 0 || meta6.amount < 0) {
      throw new Error('Las metas de recuperación no pueden ser montos negativos.');
    }
    this.props.metaBucket5 = meta5;
    this.props.metaBucket6 = meta6;
    this.props.updatedAt = new Date();
  }
}
