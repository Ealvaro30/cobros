import { ValueObject, DiasMora } from '../shared/ValueObjects';

export type BucketValue = 5 | 6 | null;

/**
 * Objeto de valor que representa el Bucket de mora de un cliente de forma automática.
 * Reglas de negocio:
 * - Bucket 5: 121 - 150 días de mora
 * - Bucket 6: 151 - 180 días de mora
 */
export class Bucket extends ValueObject<{ value: BucketValue }> {
  private constructor(value: BucketValue) {
    super({ value });
  }

  /**
   * Calcula de forma estricta el Bucket financiero correspondiente según los días de mora.
   */
  public static fromDiasMora(diasMora: DiasMora): Bucket {
    const value = diasMora.value;
    if (value >= 121 && value <= 150) {
      return new Bucket(5);
    }
    if (value >= 151 && value <= 180) {
      return new Bucket(6);
    }
    return new Bucket(null);
  }

  /**
   * Crea una instancia a partir de un valor numérico explícito con validación.
   */
  public static create(value: number | null): Bucket {
    if (value === null || value === undefined) {
      return new Bucket(null);
    }
    if (value !== 5 && value !== 6) {
      throw new Error('El bucket solo puede ser 5, 6 o nulo.');
    }
    return new Bucket(value);
  }

  get value(): BucketValue {
    return this.props.value;
  }

  get isBucket5(): boolean {
    return this.props.value === 5;
  }

  get isBucket6(): boolean {
    return this.props.value === 6;
  }
}
