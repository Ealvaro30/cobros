import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ReportsService } from './reports.service';
import { ExcelService } from './excel.service';
import { PdfService } from './pdf.service';
import { ReportsScheduler } from './reports.scheduler';
import { ReportsController } from './reports.controller';
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
  controllers: [ReportsController],
  providers: [ReportsService, ExcelService, PdfService, ReportsScheduler],
  exports: [ReportsService, ExcelService, PdfService, ReportsScheduler],
})
export class ReportsModule {}
