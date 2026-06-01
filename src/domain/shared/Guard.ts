/**
 * Guardas de validación estáticas para precondiciones de dominio.
 * Permiten validar invariantes antes de construir entidades/value objects.
 */

export interface IGuardResult {
  succeeded: boolean;
  message?: string;
}

export interface IGuardArgument {
  argument: unknown;
  argumentName: string;
}

export class Guard {
  /**
   * Verifica que un valor no sea null ni undefined.
   */
  public static againstNullOrUndefined(argument: unknown, argumentName: string): IGuardResult {
    if (argument === null || argument === undefined) {
      return { succeeded: false, message: `${argumentName} es null o undefined.` };
    }
    return { succeeded: true };
  }

  /**
   * Verifica que múltiples valores no sean null ni undefined.
   */
  public static againstNullOrUndefinedBulk(args: IGuardArgument[]): IGuardResult {
    for (const arg of args) {
      const result = this.againstNullOrUndefined(arg.argument, arg.argumentName);
      if (!result.succeeded) return result;
    }
    return { succeeded: true };
  }

  /**
   * Verifica que un string no esté vacío.
   */
  public static againstEmpty(argument: string | null | undefined, argumentName: string): IGuardResult {
    if (argument === null || argument === undefined || argument.trim() === '') {
      return { succeeded: false, message: `${argumentName} está vacío.` };
    }
    return { succeeded: true };
  }

  /**
   * Verifica que un valor esté dentro de un rango numérico.
   */
  public static inRange(num: number, min: number, max: number, argumentName: string): IGuardResult {
    if (num < min || num > max) {
      return {
        succeeded: false,
        message: `${argumentName} no está en el rango permitido [${min}, ${max}]. Valor: ${num}.`,
      };
    }
    return { succeeded: true };
  }

  /**
   * Verifica que un valor sea uno de los valores permitidos.
   */
  public static isOneOf<T>(value: T, validValues: T[], argumentName: string): IGuardResult {
    if (!validValues.includes(value)) {
      return {
        succeeded: false,
        message: `${argumentName} no es un valor válido. Valores permitidos: [${validValues.join(', ')}]. Valor recibido: ${value}.`,
      };
    }
    return { succeeded: true };
  }

  /**
   * Verifica que un número sea mayor que un valor mínimo.
   */
  public static greaterThan(num: number, min: number, argumentName: string): IGuardResult {
    if (num <= min) {
      return {
        succeeded: false,
        message: `${argumentName} debe ser mayor que ${min}. Valor: ${num}.`,
      };
    }
    return { succeeded: true };
  }

  /**
   * Verifica que un número sea mayor o igual que un valor mínimo.
   */
  public static greaterThanOrEqual(num: number, min: number, argumentName: string): IGuardResult {
    if (num < min) {
      return {
        succeeded: false,
        message: `${argumentName} debe ser mayor o igual que ${min}. Valor: ${num}.`,
      };
    }
    return { succeeded: true };
  }

  /**
   * Verifica que una colección tenga al menos N elementos.
   */
  public static againstAtLeast(numChars: number, text: string, argumentName: string): IGuardResult {
    if (text.length < numChars) {
      return {
        succeeded: false,
        message: `${argumentName} debe tener al menos ${numChars} caracteres. Tiene: ${text.length}.`,
      };
    }
    return { succeeded: true };
  }

  /**
   * Verifica que una colección no exceda N elementos.
   */
  public static againstAtMost(numChars: number, text: string, argumentName: string): IGuardResult {
    if (text.length > numChars) {
      return {
        succeeded: false,
        message: `${argumentName} debe tener como máximo ${numChars} caracteres. Tiene: ${text.length}.`,
      };
    }
    return { succeeded: true };
  }

  /**
   * Verifica que un valor sea un número válido.
   */
  public static isValidNumber(value: unknown, argumentName: string): IGuardResult {
    if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
      return {
        succeeded: false,
        message: `${argumentName} no es un número válido. Valor: ${value}.`,
      };
    }
    return { succeeded: true };
  }

  /**
   * Verifica que un valor sea un UUID válido.
   */
  public static isValidUUID(value: string, argumentName: string): IGuardResult {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      return {
        succeeded: false,
        message: `${argumentName} no es un UUID válido. Valor: ${value}.`,
      };
    }
    return { succeeded: true };
  }

  /**
   * Verifica que una fecha no esté en el pasado.
   */
  public static isNotPastDate(date: Date, argumentName: string): IGuardResult {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
      return {
        succeeded: false,
        message: `${argumentName} no puede estar en el pasado. Fecha: ${date.toISOString()}.`,
      };
    }
    return { succeeded: true };
  }

  /**
   * Combina múltiples resultados de guard. Retorna el primer error encontrado.
   */
  public static combine(guardResults: IGuardResult[]): IGuardResult {
    for (const result of guardResults) {
      if (!result.succeeded) return result;
    }
    return { succeeded: true };
  }
}
