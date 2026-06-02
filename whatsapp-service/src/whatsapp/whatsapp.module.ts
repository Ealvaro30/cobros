import { Module } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { WhatsappController } from './whatsapp.controller';
import { AntiBotService } from './anti-bot.service';
import { RedisModule } from '../redis/redis.module';
import { AiModule } from '../ai/ai.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { ExcelModule } from '../reports/excel.module';

@Module({
  imports: [RedisModule, AiModule, SupabaseModule, ExcelModule],
  controllers: [WhatsappController],
  providers: [WhatsappService, AntiBotService],
  exports: [WhatsappService, AntiBotService],
})
export class WhatsappModule {}
