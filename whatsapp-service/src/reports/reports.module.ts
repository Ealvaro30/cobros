import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ReportsService } from './reports.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    SupabaseModule,
    WhatsappModule,
    ConfigModule
  ],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
