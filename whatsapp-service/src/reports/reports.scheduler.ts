import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseService } from '../supabase/supabase.service';
import { ReportsService } from './reports.service';
import { format } from 'date-fns';

@Injectable()
export class ReportsScheduler {
  private readonly logger = new Logger(ReportsScheduler.name);
  private lastRunDate: string | null = null;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly reportsService: ReportsService,
  ) { }

  // Check every minute
  @Cron(CronExpression.EVERY_MINUTE)
  async checkSchedule() {
    try {
      const supabase = this.supabaseService.getClient();

      const { data: config } = await supabase
        .from('whatsapp_config')
        .select('schedule_time, is_active')
        .single();

      if (!config || !config.is_active) {
        return;
      }

      const now = new Date();
      // schedule_time is '18:00:00' format
      const currentTimeStr = format(now, 'HH:mm');
      const configTimeStr = config.schedule_time.substring(0, 5); // '18:00'

      const currentDateStr = format(now, 'yyyy-MM-dd');

      if (currentTimeStr === configTimeStr) {
        // Prevent running multiple times in the same minute
        if (this.lastRunDate !== currentDateStr) {
          this.logger.log(`Scheduled time reached (${configTimeStr}). Triggering Daily Report...`);
          this.lastRunDate = currentDateStr;
          await this.reportsService.generateDailyReport();
        }
      }

    } catch (err) {
      this.logger.error('Error checking schedule', err);
    }
  }
}
