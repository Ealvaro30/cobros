import { AggregateRoot } from '../shared/AggregateRoot';
import { Guard } from '../shared/Guard';

export type TaskPriority = 'baja' | 'media' | 'alta' | 'urgente';
export type TaskStatus = 'PENDIENTE' | 'PROGRESO' | 'COMPLETADA' | 'VENCIDA';

export interface TaskProps {
  titulo: string;
  descripcion: string | null;
  tipo: string;
  prioridad: TaskPriority;
  estado: TaskStatus;
  asignadoId: string;
  clienteId: string | null;
  fechaVencimiento: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Entidad Aggregate Root de Tareas y Seguimiento Operativo.
 */
export class Task extends AggregateRoot<TaskProps> {
  private constructor(props: TaskProps, id?: string) {
    super(props, id);
  }

  public static create(params: {
    titulo: string;
    descripcion?: string;
    tipo: string;
    prioridad: TaskPriority;
    asignadoId: string;
    clienteId?: string;
    fechaVencimiento: Date;
  }): Task {
    const guardResult = Guard.combine([
      Guard.againstNullOrUndefined(params.titulo, 'titulo'),
      Guard.againstNullOrUndefined(params.tipo, 'tipo'),
      Guard.againstNullOrUndefined(params.asignadoId, 'asignadoId'),
    ]);

    if (!guardResult.succeeded) {
      throw new Error(guardResult.message);
    }

    const task = new Task({
      titulo: params.titulo,
      descripcion: params.descripcion || null,
      tipo: params.tipo,
      prioridad: params.prioridad,
      estado: 'PENDIENTE',
      asignadoId: params.asignadoId,
      clienteId: params.clienteId || null,
      fechaVencimiento: params.fechaVencimiento,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    task.addDomainEvent('TASK_CREATED', {
      taskId: task.id,
      titulo: params.titulo,
      asignadoId: params.asignadoId,
    });

    return task;
  }

  public static reconstitute(props: TaskProps, id: string): Task {
    return new Task(props, id);
  }

  // --- Getters ---
  get titulo(): string { return this.props.titulo; }
  get descripcion(): string | null { return this.props.descripcion; }
  get tipo(): string { return this.props.tipo; }
  get prioridad(): TaskPriority { return this.props.prioridad; }
  get estado(): TaskStatus { return this.props.estado; }
  get asignadoId(): string { return this.props.asignadoId; }
  get clienteId(): string | null { return this.props.clienteId; }
  get fechaVencimiento(): Date { return this.props.fechaVencimiento; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  // --- Lógica ---
  public iniciar(): void {
    if (this.props.estado !== 'PENDIENTE') {
      throw new Error(`Solo se pueden iniciar tareas pendientes. Estado actual: ${this.props.estado}`);
    }
    this.props.estado = 'PROGRESO';
    this.props.updatedAt = new Date();
  }

  public completar(): void {
    if (this.props.estado === 'COMPLETADA') {
      throw new Error('La tarea ya fue completada.');
    }
    this.props.estado = 'COMPLETADA';
    this.props.updatedAt = new Date();

    this.addDomainEvent('TASK_COMPLETED', {
      taskId: this.id,
      titulo: this.props.titulo,
      asignadoId: this.props.asignadoId,
    });
  }

  public verificarVencimiento(): void {
    if (this.props.estado !== 'COMPLETADA' && this.props.estado !== 'VENCIDA') {
      if (new Date() > this.props.fechaVencimiento) {
        this.props.estado = 'VENCIDA';
        this.props.updatedAt = new Date();
        this.addDomainEvent('TASK_OVERDUE', {
          taskId: this.id,
          titulo: this.props.titulo,
          asignadoId: this.props.asignadoId,
        });
      }
    }
  }

  public reasignar(nuevoAsignadoId: string): void {
    if (!nuevoAsignadoId) {
      throw new Error('El nuevo ID de asignado no puede ser nulo o vacío.');
    }
    this.props.asignadoId = nuevoAsignadoId;
    this.props.updatedAt = new Date();
  }
}
