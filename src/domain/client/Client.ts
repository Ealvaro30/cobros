import { AggregateRoot } from '../shared/AggregateRoot';
import { Money, DiasMora, PhoneNumber, EmailAddress } from '../shared/ValueObjects';
import { Bucket, BucketValue } from './Bucket';

export type EstadoCliente =
  | 'SALVADA'
  | 'NO SALVADA'
  | 'PROMESA DE PAGO'
  | 'REPROGRAMADO'
  | 'NO CONTESTA'
  | 'NUMERO INCORRECTO'
  | 'VOLVER A LLAMAR'
  | 'PAGARA HOY'
  | 'PAGARA SEMANA'
  | 'CLIENTE MOLESTO';

export interface ClientProps {
  idCliente: string | null;
  cedula: string | null;
  nombre: string;
  telefono: PhoneNumber | null;
  whatsapp: PhoneNumber | null;
  capital: Money;
  saldoDolares: Money;
  diasMora: DiasMora;
  estado: EstadoCliente;
  agenteId: string | null;
  campanaId: string | null;
  fechaAsignacion: Date | null;
  fechaRegistro: Date;
  mesCartera: string | null;
  promesaPago: boolean;
  fechaPromesa: Date | null;
  montoPromesa: Money;
  direccion: string | null;
  correo: EmailAddress | null;
  empresa: string | null;
  observaciones: string | null;
  montoRecuperado: Money;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Entidad Agregada Cliente (DDD Aggregate Root).
 * Modela un cliente moroso y encapsula las reglas de negocio financieras.
 */
export class Client extends AggregateRoot<ClientProps> {
  private constructor(props: ClientProps, id?: string) {
    super(props, id);
  }

  /**
   * Factory Method para instanciar un Cliente de forma segura con consistencia inicial.
   */
  public static create(props: ClientProps, id?: string): Client {
    if (!props.nombre || props.nombre.trim() === '') {
      throw new Error('El nombre del cliente es obligatorio.');
    }
    const client = new Client(
      {
        ...props,
        fechaRegistro: props.fechaRegistro || new Date(),
        createdAt: props.createdAt || new Date(),
        updatedAt: props.updatedAt || new Date(),
      },
      id
    );

    client.addDomainEvent('CLIENT_CREATED', {
      clienteId: client.id,
      nombre: client.props.nombre,
      capital: client.props.capital.amount,
      estado: client.props.estado,
    });

    return client;
  }

  // --- Getters de Propiedades ---
  get idCliente(): string | null { return this.props.idCliente; }
  get cedula(): string | null { return this.props.cedula; }
  get nombre(): string { return this.props.nombre; }
  get telefono(): PhoneNumber | null { return this.props.telefono; }
  get whatsapp(): PhoneNumber | null { return this.props.whatsapp; }
  get capital(): Money { return this.props.capital; }
  get saldoDolares(): Money { return this.props.saldoDolares; }
  get diasMora(): DiasMora { return this.props.diasMora; }
  get estado(): EstadoCliente { return this.props.estado; }
  get agenteId(): string | null { return this.props.agenteId; }
  get campanaId(): string | null { return this.props.campanaId; }
  get fechaAsignacion(): Date | null { return this.props.fechaAsignacion; }
  get fechaRegistro(): Date { return this.props.fechaRegistro; }
  get mesCartera(): string | null { return this.props.mesCartera; }
  get promesaPago(): boolean { return this.props.promesaPago; }
  get fechaPromesa(): Date | null { return this.props.fechaPromesa; }
  get montoPromesa(): Money { return this.props.montoPromesa; }
  get direccion(): string | null { return this.props.direccion; }
  get correo(): EmailAddress | null { return this.props.correo; }
  get empresa(): string | null { return this.props.empresa; }
  get observaciones(): string | null { return this.props.observaciones; }
  get montoRecuperado(): Money { return this.props.montoRecuperado; }
  get createdAt(): Date | undefined { return this.props.createdAt; }
  get updatedAt(): Date | undefined { return this.props.updatedAt; }

  /**
   * Propiedad Calculada: Obtiene el bucket de mora del cliente de forma automática
   * según las reglas de negocio de morosidad (días de mora).
   */
  get bucket(): Bucket {
    return Bucket.fromDiasMora(this.props.diasMora);
  }

  // --- Métodos de Comportamiento / Lógica de Negocio ---

  /**
   * Asigna el cliente a un agente específico del centro de cobranzas.
   */
  public asignarAgente(agenteId: string): void {
    if (!agenteId) {
      throw new Error('El ID del agente no puede ser nulo o vacío.');
    }
    this.props.agenteId = agenteId;
    this.props.fechaAsignacion = new Date();
    this.props.updatedAt = new Date();

    this.addDomainEvent('CLIENT_ASSIGNED', {
      clienteId: this.id,
      agenteId,
    });
  }

  /**
   * Actualiza los días de mora del cliente y provoca el recálculo automático del Bucket.
   */
  public actualizarDiasMora(dias: number): void {
    const viejosDias = this.props.diasMora.value;
    this.props.diasMora = DiasMora.create(dias);
    this.props.updatedAt = new Date();

    this.addDomainEvent('CLIENT_UPDATED', {
      clienteId: this.id,
      viejosDias,
      nuevosDias: dias,
    });
  }

  /**
   * Registra una gestión de cobro, actualizando el estado, y la promesa de pago si aplica.
   */
  public registrarGestion(
    nuevoEstado: EstadoCliente,
    promesaPago: boolean,
    montoPromesa: number = 0,
    fechaPromesa: Date | null = null
  ): void {
    const viejoEstado = this.props.estado;
    this.props.estado = nuevoEstado;
    this.props.promesaPago = promesaPago;
    
    if (promesaPago) {
      if (montoPromesa <= 0) {
        throw new Error('El monto de la promesa de pago debe ser mayor a cero.');
      }
      if (!fechaPromesa) {
        throw new Error('Debe indicarse una fecha para la promesa de pago.');
      }
      if (fechaPromesa < new Date(new Date().setHours(0,0,0,0))) {
        throw new Error('La fecha de la promesa de pago no puede estar en el pasado.');
      }
      this.props.montoPromesa = Money.create(montoPromesa);
      this.props.fechaPromesa = fechaPromesa;
    } else {
      this.props.montoPromesa = Money.create(0);
      this.props.fechaPromesa = null;
    }

    this.props.updatedAt = new Date();

    this.addDomainEvent('CLIENT_STATUS_CHANGED', {
      clienteId: this.id,
      viejoEstado,
      nuevoEstado,
      promesaPago,
      montoPromesa,
      fechaPromesa: fechaPromesa?.toISOString() || null,
    });
  }

  /**
   * Registra la recuperación real de dinero amortizando al saldo pendiente y sumando al recuperado.
   */
  public registrarPagoRecuperado(monto: Money): void {
    if (monto.amount <= 0) {
      throw new Error('El monto del pago recuperado debe ser superior a cero.');
    }
    
    this.props.montoRecuperado = this.props.montoRecuperado.add(monto);
    const viejoSaldo = this.props.saldoDolares.amount;
    
    // Si el capital recuperado supera el saldo actual, se ajusta a cero (amortización total)
    if (monto.amount >= this.props.saldoDolares.amount) {
      this.props.saldoDolares = Money.create(0, this.props.saldoDolares.currency);
      this.props.estado = 'SALVADA'; // Cliente normaliza su crédito
    } else {
      this.props.saldoDolares = this.props.saldoDolares.subtract(monto);
    }
    
    this.props.updatedAt = new Date();

    this.addDomainEvent('CLIENT_SCORE_UPDATED', {
      clienteId: this.id,
      montoPago: monto.amount,
      viejoSaldo,
      nuevoSaldo: this.props.saldoDolares.amount,
      estado: this.props.estado,
    });
  }
}
