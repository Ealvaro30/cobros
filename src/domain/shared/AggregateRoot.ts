import { Entity } from './Entity';
import { IDomainEvent, DomainEvent, DomainEventType } from './DomainEvent';

/**
 * Clase base para Aggregate Roots (DDD).
 * Extiende Entity con capacidad de acumular y emitir Domain Events.
 * Los eventos se acumulan durante la operación de negocio y se despachan
 * al persistir el aggregate (patrón Unit of Work).
 */
export abstract class AggregateRoot<T> extends Entity<T> {
  private _domainEvents: IDomainEvent[] = [];

  constructor(props: T, id?: string) {
    super(props, id);
  }

  /**
   * Obtiene los eventos de dominio pendientes de despacho.
   */
  get domainEvents(): ReadonlyArray<IDomainEvent> {
    return Object.freeze([...this._domainEvents]);
  }

  /**
   * Registra un evento de dominio para despacho posterior.
   */
  protected addDomainEvent(
    eventType: DomainEventType,
    payload: Record<string, unknown>,
    metadata?: IDomainEvent['metadata']
  ): void {
    this._domainEvents.push(
      new DomainEvent(eventType, this._id, payload, metadata)
    );
  }

  /**
   * Limpia los eventos de dominio después de ser despachados.
   * Debe llamarse por el repositorio tras persistir exitosamente.
   */
  public clearDomainEvents(): void {
    this._domainEvents = [];
  }

  /**
   * Verifica si hay eventos pendientes de despacho.
   */
  public hasPendingEvents(): boolean {
    return this._domainEvents.length > 0;
  }

  /**
   * Obtiene el conteo de eventos pendientes.
   */
  public pendingEventCount(): number {
    return this._domainEvents.length;
  }
}
