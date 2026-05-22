/**
 * Calcula el bucket según los días de mora
 * Bucket 5: 121-150 días
 * Bucket 6: 151-180 días
 */
export function calcularBucket(diasMora: number): number | null {
  if (diasMora >= 151 && diasMora <= 180) return 6;
  if (diasMora >= 121 && diasMora <= 150) return 5;
  return null;
}

/**
 * Calcula la proyección: actual + promesas
 */
export function calcularProyeccion(actual: number, promesas: number): number {
  return actual + promesas;
}

/**
 * Calcula lo que falta para la meta
 */
export function calcularFalta(meta: number, actual: number): number {
  return Math.max(0, meta - actual);
}

/**
 * Calcula el porcentaje de cumplimiento
 */
export function calcularCumplimiento(actual: number, meta: number): number {
  if (meta <= 0) return 0;
  return Math.min(100, Math.round((actual / meta) * 100 * 100) / 100);
}
