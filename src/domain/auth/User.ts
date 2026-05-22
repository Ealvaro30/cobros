import { Entity } from '../shared/Entity';
import { EmailAddress } from '../shared/ValueObjects';
import { Role } from './Role';

export interface UserProps {
  email: EmailAddress;
  fullName: string;
  role: Role;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Entidad Perfil de Usuario (DDD Aggregate Root).
 * Representa a un agente, supervisor o administrador dentro del sistema de cobranzas.
 */
export class User extends Entity<UserProps> {
  private constructor(props: UserProps, id?: string) {
    super(props, id);
  }

  /**
   * Factory Method para instanciar un Usuario del sistema.
   */
  public static create(props: UserProps, id?: string): User {
    if (!props.fullName || props.fullName.trim() === '') {
      throw new Error('El nombre completo del usuario es requerido.');
    }
    return new User(
      {
        ...props,
        isActive: props.isActive !== undefined ? props.isActive : true,
        createdAt: props.createdAt || new Date(),
        updatedAt: props.updatedAt || new Date(),
      },
      id
    );
  }

  // --- Getters de Propiedades ---
  get email(): EmailAddress { return this.props.email; }
  get fullName(): string { return this.props.fullName; }
  get role(): Role { return this.props.role; }
  get avatarUrl(): string | null { return this.props.avatarUrl; }
  get isActive(): boolean { return this.props.isActive; }
  get createdAt(): Date | undefined { return this.props.createdAt; }
  get updatedAt(): Date | undefined { return this.props.updatedAt; }

  // --- Comportamientos de Dominio ---

  /**
   * Cambia el rol del usuario en el sistema.
   */
  public cambiarRol(nuevoRol: Role): void {
    this.props.role = nuevoRol;
    this.props.updatedAt = new Date();
  }

  /**
   * Desactiva temporalmente o activa a un agente en el sistema (por ejemplo, suspensión).
   */
  public toggleActivo(activo: boolean): void {
    this.props.isActive = activo;
    this.props.updatedAt = new Date();
  }

  /**
   * Actualiza el nombre completo del usuario.
   */
  public actualizarNombre(nombre: string): void {
    if (!nombre || nombre.trim() === '') {
      throw new Error('El nombre completo no puede estar vacío.');
    }
    this.props.fullName = nombre.trim();
    this.props.updatedAt = new Date();
  }
}
