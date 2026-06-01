/**
 * Monada Result<T, E> para manejo funcional de errores en el dominio.
 * Evita excepciones para control de flujo, permite composición y encadenamiento seguro.
 */

export class Result<T, E = string> {
  private readonly _isSuccess: boolean;
  private readonly _value?: T;
  private readonly _error?: E;

  private constructor(isSuccess: boolean, value?: T, error?: E) {
    if (isSuccess && error !== undefined) {
      throw new Error('Result inválido: un resultado exitoso no puede contener un error.');
    }
    if (!isSuccess && error === undefined) {
      throw new Error('Result inválido: un resultado fallido debe contener un error.');
    }

    this._isSuccess = isSuccess;
    this._value = value;
    this._error = error;
    Object.freeze(this);
  }

  get isSuccess(): boolean {
    return this._isSuccess;
  }

  get isFailure(): boolean {
    return !this._isSuccess;
  }

  get value(): T {
    if (!this._isSuccess) {
      throw new Error('No se puede obtener el valor de un resultado fallido. Verifique isSuccess primero.');
    }
    return this._value as T;
  }

  get error(): E {
    if (this._isSuccess) {
      throw new Error('No se puede obtener el error de un resultado exitoso. Verifique isFailure primero.');
    }
    return this._error as E;
  }

  /**
   * Crea un Result exitoso con un valor.
   */
  public static ok<U, F = string>(value?: U): Result<U, F> {
    return new Result<U, F>(true, value);
  }

  /**
   * Crea un Result fallido con un error.
   */
  public static fail<U, F = string>(error: F): Result<U, F> {
    return new Result<U, F>(false, undefined, error);
  }

  /**
   * Combina múltiples Results. Si alguno falla, retorna el primer error.
   */
  public static combine<F = string>(results: Result<unknown, F>[]): Result<void, F> {
    for (const result of results) {
      if (result.isFailure) {
        return Result.fail<void, F>(result.error);
      }
    }
    return Result.ok<void, F>();
  }

  /**
   * Mapea el valor del Result si es exitoso.
   */
  public map<U>(fn: (value: T) => U): Result<U, E> {
    if (this.isFailure) {
      return Result.fail<U, E>(this._error as E);
    }
    return Result.ok<U, E>(fn(this._value as T));
  }

  /**
   * Encadena una operación que retorna un Result.
   */
  public flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    if (this.isFailure) {
      return Result.fail<U, E>(this._error as E);
    }
    return fn(this._value as T);
  }

  /**
   * Obtiene el valor o un valor por defecto si es fallido.
   */
  public getOrElse(defaultValue: T): T {
    if (this.isFailure) {
      return defaultValue;
    }
    return this._value as T;
  }

  /**
   * Ejecuta un efecto lateral si el resultado es exitoso.
   */
  public onSuccess(fn: (value: T) => void): Result<T, E> {
    if (this._isSuccess) {
      fn(this._value as T);
    }
    return this;
  }

  /**
   * Ejecuta un efecto lateral si el resultado es fallido.
   */
  public onFailure(fn: (error: E) => void): Result<T, E> {
    if (!this._isSuccess) {
      fn(this._error as E);
    }
    return this;
  }
}
