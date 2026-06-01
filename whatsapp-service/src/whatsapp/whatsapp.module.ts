import { Module } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { AntiBotService } from './anti-bot.service';
import { RedisModule } from '../redis/redis.module';
import { AiModule } from '../ai/ai.module';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [RedisModule, AiModule, SupabaseModule],
  providers: [WhatsappService, AntiBotService],
  exports: [WhatsappService, AntiBotService],
})
export class WhatsappModule {}
