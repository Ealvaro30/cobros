import { Module } from '@nestjs/common';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { AiModule } from './ai/ai.module';
import { ConfigModule } from './config/config.module';
import { RedisModule } from './redis/redis.module';
import { SupabaseModule } from './supabase/supabase.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    ConfigModule,
    RedisModule,
    SupabaseModule,
    AiModule,
    WhatsappModule,
    ReportsModule,
  ],
})
export class AppModule {}
