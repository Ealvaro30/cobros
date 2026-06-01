import { Task, TaskStatus } from './Task';

export interface ITaskRepository {
  save(task: Task): Promise<void>;
  findById(id: string): Promise<Task | null>;
  findByAsignadoId(asignadoId: string): Promise<Task[]>;
  findByClienteId(clienteId: string): Promise<Task[]>;
  findByEstado(estado: TaskStatus): Promise<Task[]>;
  findOverdue(): Promise<Task[]>;
  list(filters: {
    asignadoId?: string;
    clienteId?: string;
    estado?: TaskStatus;
    limit?: number;
    offset?: number;
  }): Promise<Task[]>;
  delete(id: string): Promise<void>;
}
