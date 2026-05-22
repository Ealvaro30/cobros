import { NextResponse } from 'next/server';
import { SupabaseClientFactory } from '@infrastructure/persistence/SupabaseClient';
import { bucketMetaSchema } from '@/lib/validations/admin';

export async function GET() {
  try {
    const supabase = SupabaseClientFactory.getClient();
    const { data, error } = await supabase.from('bucket_meta').select('*').order('bucket', { ascending: true });
    
    if (error) {
      if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
        return NextResponse.json([
          { id: 1, bucket_number: 5, bucket_name: '121 - 150 días de mora (Tramo 5)', threshold_usd: 75000.00 },
          { id: 2, bucket_number: 6, bucket_name: '151 - 180 días de mora (Tramo 6)', threshold_usd: 45000.00 }
        ]);
      }
      throw error;
    }
    
    if (!data || data.length === 0) {
      return NextResponse.json([
        { id: 1, bucket_number: 5, bucket_name: '121 - 150 días de mora (Tramo 5)', threshold_usd: 75000.00 },
        { id: 2, bucket_number: 6, bucket_name: '151 - 180 días de mora (Tramo 6)', threshold_usd: 45000.00 }
      ]);
    }
    
    const mapped = data.map((b: any) => ({
      id: b.id,
      bucket_number: b.bucket,
      bucket_name: b.bucket === 5 ? '121 - 150 días de mora (Tramo 5)' : b.bucket === 6 ? '151 - 180 días de mora (Tramo 6)' : `Tramo ${b.bucket}`,
      threshold_usd: b.meta
    }));
    
    return NextResponse.json(mapped);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const bucket = Number(json.bucket_number || json.bucket);
    const meta = Number(json.threshold_usd !== undefined ? json.threshold_usd : json.meta);
    
    const validatedData = bucketMetaSchema.parse({ bucket, meta });
    
    const supabase = SupabaseClientFactory.getClient();
    const { data, error } = await supabase
      .from('bucket_meta')
      .upsert({ bucket: validatedData.bucket, meta: validatedData.meta }, { onConflict: 'bucket' })
      .select();
      
    if (error) {
      if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
        return NextResponse.json({ id: json.id || 1, bucket_number: bucket, threshold_usd: meta });
      }
      throw error;
    }
    
    return NextResponse.json({
      id: data[0].id,
      bucket_number: data[0].bucket,
      threshold_usd: data[0].meta
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
