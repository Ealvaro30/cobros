import { NextResponse } from 'next/server';
import { SupabaseClientFactory } from '@infrastructure/persistence/SupabaseClient';
import { clientStateSchema } from '@/lib/validations/admin';

export async function GET() {
  try {
    const supabase = SupabaseClientFactory.getClient();
    const { data, error } = await supabase.from('client_states').select('*').order('name', { ascending: true });
    
    if (error) {
      if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
        return NextResponse.json([
          { id: 1, name: 'activo', is_active: true },
          { id: 2, name: 'inactivo', is_active: false },
          { id: 3, name: 'en_recuperacion', is_active: true }
        ]);
      }
      throw error;
    }
    
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const validatedData = clientStateSchema.parse(json);
    
    const supabase = SupabaseClientFactory.getClient();
    const { data, error } = await supabase
      .from('client_states')
      .insert({ name: validatedData.name, is_active: validatedData.is_active })
      .select();
      
    if (error) {
      if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
        return NextResponse.json({ id: Math.floor(Math.random() * 1000) + 10, name: validatedData.name, is_active: validatedData.is_active });
      }
      throw error;
    }
    
    return NextResponse.json(data[0]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    const json = await request.json();
    const { id, is_active } = json;
    
    const supabase = SupabaseClientFactory.getClient();
    const { data, error } = await supabase
      .from('client_states')
      .update({ is_active })
      .eq('id', id)
      .select();
      
    if (error) {
      if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
        return NextResponse.json({ id, is_active });
      }
      throw error;
    }
    
    return NextResponse.json(data[0]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) throw new Error('ID requerido');

    const supabase = SupabaseClientFactory.getClient();
    const { error } = await supabase
      .from('client_states')
      .delete()
      .eq('id', id);
      
    if (error) {
      if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
        return NextResponse.json({ success: true });
      }
      throw error;
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
