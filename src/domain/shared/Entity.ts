/**
 * Clase base para todas las Entidades del Dominio (DDD).
 * Garantiza identidad persistente e inmutable mediante un identificador único (UUID).
 */
export abstract class Entity<T> {
  protected readonly _id: string;
  protected props: T;

  constructor(props: T, id?: string) {
    // Generar UUID si no se proporciona uno existente
    this._id = id || crypto.randomUUID();
    this.props = props;
  }

  /**
   * Obtiene el identificador único de la entidad.
   */
  get id(): string {
    return this._id;
  }

  /**
   * Compara la igualdad de dos entidades basándose en su identidad única (ID).
   */
  public equals(object?: Entity<T>): boolean {
    if (object === null || object === undefined) {
      return false;
    }

    if (this === object) {
      return true;
    }

    return this._id === object._id;
  }
}
