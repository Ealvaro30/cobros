export interface OperacionDetalle {
  codigo: string;
  montoMinimo: number;
  totalOperacion: number;
}

export const getOperacionesCliente = (id: string, capital: number, observaciones?: string | null): OperacionDetalle[] => {
  if (observaciones) {
    try {
      const parsed = JSON.parse(observaciones);
      if (parsed && Array.isArray(parsed.ops)) {
        return parsed.ops.map((op: any) => ({
          codigo: String(op.codigo || ''),
          montoMinimo: Number(op.montoMinimo || 0),
          totalOperacion: Number(op.totalOperacion || 0)
        }));
      }
    } catch (e) {
      // not JSON, fallback
    }
  }

  // Deterministic fallback generator
  const codeHash = id.split('-')[0] || '1234';
  const parsed = parseInt(codeHash, 16) || 45;
  const numOps = (parsed % 3) + 1; // 1, 2, or 3 operations
  
  const ops: OperacionDetalle[] = [];
  let remainingCapital = capital;
  
  for (let i = 0; i < numOps; i++) {
    const opId = `OP-${1000 + (parsed % 9000) + i}`;
    const opTotal = i === numOps - 1 ? remainingCapital : Math.round((capital / numOps) * 100) / 100;
    remainingCapital -= opTotal;
    
    const pct = 10 + (parsed % 15);
    const opMin = Math.round((opTotal * (pct / 100)) * 100) / 100;
    
    ops.push({
      codigo: opId,
      montoMinimo: opMin,
      totalOperacion: opTotal
    });
  }
  
  return ops;
};

export const getMontoMinimoTotal = (id: string, capital: number, observaciones?: string | null): number => {
  const ops = getOperacionesCliente(id, capital, observaciones);
  return ops.reduce((acc, curr) => acc + curr.montoMinimo, 0);
};
