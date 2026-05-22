import { NextResponse } from 'next/server';
import { SupabaseClientFactory } from '@infrastructure/persistence/SupabaseClient';
import { commissionRateSchema } from '@/lib/validations/admin';

export async function GET() {
  try {
    const supabase = SupabaseClientFactory.getClient();
    const { data, error } = await supabase
      .from('commission_rates')
      .select('*')
      .order('level', { ascending: true })
      .order('bucket', { ascending: true });
    
    if (error) {
      if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
        return NextResponse.json([
          { id: 1, achievement_level: 'Nivel 1 (Meta)', bucket_5_rate: 50, bucket_6_rate: 150 },
          { id: 2, achievement_level: 'Nivel 2 (Superación)', bucket_5_rate: 100, bucket_6_rate: 300 }
        ]);
      }
      throw error;
    }
    
    if (!data || data.length === 0) {
      return NextResponse.json([
        { id: 1, achievement_level: 'Nivel 1 (Meta)', bucket_5_rate: 50, bucket_6_rate: 150 },
        { id: 2, achievement_level: 'Nivel 2 (Superación)', bucket_5_rate: 100, bucket_6_rate: 300 }
      ]);
    }
    
    // Group by level
    const levelsMap: Record<number, any> = {};
    data.forEach((row: any) => {
      const lvl = row.level;
      if (!levelsMap[lvl]) {
        levelsMap[lvl] = {
          id: lvl,
          achievement_level: lvl === 1 ? 'Nivel 1 (Meta)' : lvl === 2 ? 'Nivel 2 (Superación)' : `Nivel ${lvl}`,
          bucket_5_rate: 0,
          bucket_6_rate: 0
        };
      }
      if (row.bucket === 5) {
        levelsMap[lvl].bucket_5_rate = row.amount;
      } else if (row.bucket === 6) {
        levelsMap[lvl].bucket_6_rate = row.amount;
      }
    });

    const result = Object.values(levelsMap).sort((a: any, b: any) => a.id - b.id);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const level = Number(json.id || json.level);
    const b5Rate = Number(json.bucket_5_rate);
    const b6Rate = Number(json.bucket_6_rate);
    
    const val5 = commissionRateSchema.parse({ bucket: 5, level, amount: b5Rate });
    const val6 = commissionRateSchema.parse({ bucket: 6, level, amount: b6Rate });
    
    const supabase = SupabaseClientFactory.getClient();
    
    const { error: err5 } = await supabase
      .from('commission_rates')
      .upsert({ bucket: val5.bucket, level: val5.level, amount: val5.amount }, { onConflict: 'bucket,level' });
      
    if (err5) {
      if (err5.message?.includes('relation') || err5.message?.includes('does not exist')) {
        return NextResponse.json(json);
      }
      throw err5;
    }
    
    const { error: err6 } = await supabase
      .from('commission_rates')
      .upsert({ bucket: val6.bucket, level: val6.level, amount: val6.amount }, { onConflict: 'bucket,level' });
      
    if (err6) {
      if (err6.message?.includes('relation') || err6.message?.includes('does not exist')) {
        return NextResponse.json(json);
      }
      throw err6;
    }
    
    return NextResponse.json(json);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
