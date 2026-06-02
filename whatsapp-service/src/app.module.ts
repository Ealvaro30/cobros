import { Module } from '@nestjs/common';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { AiModule } from './ai/ai.module';
import { ConfigModule } from './config/config.module';
import { RedisModule } from './redis/redis.module';
import { SupabaseModule } from './supabase/supabase.module';
import { ReportsModule } from './reports/reports.module';
import { ExcelModule } from './reports/excel.module';

@Module({
  imports: [
    ConfigModule,
    RedisModule,
    SupabaseModule,
    AiModule,
    ExcelModule,
    WhatsappModule,
    ReportsModule,
  ],
})
export class AppModule {}
