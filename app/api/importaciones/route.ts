import { NextResponse } from 'next/server';
import { ClientService } from '@application/client/ClientService';

/**
 * Controller de Importación Masiva (Presentation API Layer).
 * Recibe las filas parseadas de Excel desde el frontend y coordina la persistencia transaccional.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { campanaId, rows, usuarioId, agenteId } = body;

    if (!campanaId) {
      return NextResponse.json({ error: 'El ID de campaña es requerido para importar cartera.' }, { status: 400 });
    }
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'Se requiere un arreglo de filas de Excel válido.' }, { status: 400 });
    }
    if (!usuarioId) {
      return NextResponse.json({ error: 'El ID del usuario supervisor es requerido.' }, { status: 400 });
    }

    const service = new ClientService();
    const result = await service.importClients(campanaId, rows, usuarioId, agenteId);

    return NextResponse.json({
      success: true,
      creados: result.creados,
      actualizados: result.actualizados,
      errores: result.errores,
      totalProcesados: (result as any).totalProcesados,
      promesasCreadas: (result as any).promesasCreadas,
      seguimientosCreados: (result as any).seguimientosCreados
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
