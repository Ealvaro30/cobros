import { NextResponse } from 'next/server';
import { ClientService } from '@application/client/ClientService';
import { CreateClientInput } from '@application/client/dto/ClientDTO';
import { createServerSupabaseClient } from '@/lib/supabase/server';


/**
 * Controller de Clientes (Presentation API Layer).
 * Coordina las peticiones HTTP GET/POST delegando a los Casos de Uso de ClientService.
 */

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const bucketStr = searchParams.get('bucket');
    const estado = searchParams.get('estado') || undefined;
    const agenteId = searchParams.get('agente_id') || undefined;
    const campanaId = searchParams.get('campana_id') || undefined;
    const limitStr = searchParams.get('limit');
    const offsetStr = searchParams.get('offset');

    const bucket = bucketStr ? parseInt(bucketStr, 10) : undefined;
    const limit = limitStr ? parseInt(limitStr, 10) : undefined;
    const offset = offsetStr ? parseInt(offsetStr, 10) : undefined;

    const service = new ClientService();
    const data = await service.listClients({
      search,
      bucket,
      estado,
      agenteId,
      campanaId,
      limit,
      offset,
    });

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body: CreateClientInput = await request.json();
    const service = new ClientService();
    const data = await service.createClient(body);
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado. Debe iniciar sesión.' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Permiso denegado. No se encontró el perfil de usuario.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'El ID del cliente es requerido.' }, { status: 400 });
    }

    const service = new ClientService();
    await service.deleteClient(id, profile.role);

    return NextResponse.json({ success: true, message: 'Cliente eliminado correctamente.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

