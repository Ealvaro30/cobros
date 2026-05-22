import { NextResponse } from 'next/server';
import { CampaignRepository } from '@infrastructure/persistence/CampaignRepository';
import { Campaign } from '@domain/campaign/Campaign';
import { Money } from '@domain/shared/ValueObjects';
import { createServerSupabaseClient } from '@/lib/supabase/server';


/**
 * Controller de Campañas (Presentation API Layer).
 * Expone endpoints para el control de periodos moratorios y metas financieras globales.
 */

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';
    const repository = new CampaignRepository();

    if (activeOnly) {
      const activeCampana = await repository.findActive();
      return NextResponse.json(activeCampana ? {
        id: activeCampana.id,
        nombre: activeCampana.nombre,
        mes: activeCampana.mes,
        anio: activeCampana.anio,
        estado: activeCampana.estado,
        metaBucket5: activeCampana.metaBucket5.amount,
        metaBucket6: activeCampana.metaBucket6.amount,
      } : null);
    }

    const campanas = await repository.listAll();
    const output = campanas.map(c => ({
      id: c.id,
      nombre: c.nombre,
      mes: c.mes,
      anio: c.anio,
      estado: c.estado,
      metaBucket5: c.metaBucket5.amount,
      metaBucket6: c.metaBucket6.amount,
    }));

    return NextResponse.json(output);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const repository = new CampaignRepository();

    // Validar duplicidad de periodo
    const existing = await repository.findByPeriod(body.mes, body.anio);
    if (existing) {
      return NextResponse.json(
        { error: `Ya existe una campaña registrada para el periodo ${body.mes}/${body.anio}.` },
        { status: 400 }
      );
    }

    const campaign = Campaign.create({
      nombre: body.nombre,
      mes: body.mes,
      anio: body.anio,
      estado: body.estado || 'planificada',
      metaBucket5: Money.create(body.metaBucket5 || 0),
      metaBucket6: Money.create(body.metaBucket6 || 0),
    });

    await repository.save(campaign);

    return NextResponse.json({
      id: campaign.id,
      nombre: campaign.nombre,
      mes: campaign.mes,
      anio: campaign.anio,
      estado: campaign.estado,
      metaBucket5: campaign.metaBucket5.amount,
      metaBucket6: campaign.metaBucket6.amount,
    }, { status: 201 });
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

    if (profileError || !profile || (profile.role !== 'ADMIN' && profile.role !== 'SUPERVISOR')) {
      return NextResponse.json({ error: 'Permiso denegado. Se requiere rol ADMIN o SUPERVISOR.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'El ID de la campaña es requerido.' }, { status: 400 });
    }

    const repository = new CampaignRepository();
    
    // Check if campaign exists
    const campaign = await repository.findById(id);
    if (!campaign) {
      return NextResponse.json({ error: 'La campaña no existe.' }, { status: 404 });
    }

    await repository.delete(id);

    return NextResponse.json({ success: true, message: 'Campaña eliminada correctamente.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

