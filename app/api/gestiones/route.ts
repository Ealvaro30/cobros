import { NextResponse } from 'next/server';
import { GestionService } from '@application/gestion/GestionService';
import { RecordGestionInput } from '@application/gestion/dto/GestionDTO';

/**
 * Controller de Gestiones (Presentation API Layer).
 * Maneja las peticiones HTTP para registrar interacciones CRM y cargar timelines.
 */

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clienteId = searchParams.get('cliente_id') || undefined;
    const agenteId = searchParams.get('agente_id') || undefined;
    const promesaPagoStr = searchParams.get('promesa_pago');
    const limitStr = searchParams.get('limit');

    const promesaPago = promesaPagoStr !== null ? promesaPagoStr === 'true' : undefined;
    const limit = limitStr ? parseInt(limitStr, 10) : undefined;

    const service = new GestionService();

    if (clienteId) {
      const data = await service.getHistoryForClient(clienteId);
      return NextResponse.json(data);
    }

    const data = await service.listGestiones({
      agenteId,
      promesaPago,
      limit,
    });

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body: RecordGestionInput = await request.json();
    const service = new GestionService();
    const data = await service.recordGestion(body);
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
