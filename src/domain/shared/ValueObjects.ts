/**
 * Clase base abstracta para Objetos de Valor (Value Objects) en DDD.
 * Los objetos de valor son inmutables y no tienen identidad; se definen por sus atributos.
 */
export abstract class ValueObject<T> {
  protected readonly props: T;

  constructor(props: T) {
    this.props = Object.freeze(props);
  }

  /**
   * Compara dos Objetos de Valor por la igualdad estructural de sus propiedades.
   */
  public equals(vo?: ValueObject<T>): boolean {
    if (vo === null || vo === undefined) {
      return false;
    }
    if (vo.props === undefined) {
      return false;
    }
    return JSON.stringify(this.props) === JSON.stringify(vo.props);
  }
}

/**
 * Objeto de valor para representar dinero de forma segura.
 * Previene errores de precisión aritmética de coma flotante de JavaScript (IEEE 754).
 */
export class Money extends ValueObject<{ amount: number; currency: string }> {
  private constructor(amount: number, currency: string = 'USD') {
    super({ amount: Math.round(amount * 100) / 100, currency });
  }

  public static create(amount: number, currency: string = 'USD'): Money {
    if (amount === undefined || amount === null) {
      return new Money(0, currency);
    }
    return new Money(amount, currency);
  }

  get amount(): number {
    return this.props.amount;
  }

  get currency(): string {
    return this.props.currency;
  }

  public add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error(`No se pueden sumar diferentes monedas: ${this.currency} y ${other.currency}`);
    }
    return new Money(this.amount + other.amount, this.currency);
  }

  public subtract(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error(`No se pueden restar diferentes monedas: ${this.currency} y ${other.currency}`);
    }
    return new Money(this.amount - other.amount, this.currency);
  }

  public multiply(factor: number): Money {
    return new Money(this.amount * factor, this.currency);
  }

  public format(locale: string = 'es-NI'): string {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: this.currency,
    }).format(this.amount);
  }
}

/**
 * Objeto de valor que representa los días de mora de un cliente.
 */
export class DiasMora extends ValueObject<{ value: number }> {
  private constructor(value: number) {
    super({ value });
  }

  public static create(value: number): DiasMora {
    if (value === undefined || value === null) {
      return new DiasMora(0);
    }
    if (value < 0) {
      throw new Error('Los días de mora no pueden ser un valor negativo.');
    }
    if (!Number.isInteger(value)) {
      throw new Error('Los días de mora deben ser un número entero.');
    }
    return new DiasMora(value);
  }

  get value(): number {
    return this.props.value;
  }
}

/**
 * Objeto de valor para correos electrónicos válidos.
 */
export class EmailAddress extends ValueObject<{ email: string }> {
  private constructor(email: string) {
    super({ email });
  }

  public static create(email: string): EmailAddress {
    if (!email) {
      throw new Error('El correo electrónico no puede estar vacío.');
    }
    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      throw new Error(`El formato del correo electrónico es inválido: ${email}`);
    }
    return new EmailAddress(cleanEmail);
  }

  get value(): string {
    return this.props.email;
  }
}

/**
 * Objeto de valor que representa un número telefónico.
 */
export class PhoneNumber extends ValueObject<{ phone: string }> {
  private constructor(phone: string) {
    super({ phone });
  }

  public static create(phone: string): PhoneNumber {
    if (!phone) {
      throw new Error('El número telefónico no puede estar vacío.');
    }
    const cleanPhone = phone.replace(/\s+/g, '').replace(/[+\-()]/g, '');
    if (cleanPhone.length < 7) {
      throw new Error(`El número telefónico es demasiado corto: ${phone}`);
    }
    return new PhoneNumber(cleanPhone);
  }

  get value(): string {
    return this.props.phone;
  }
}
