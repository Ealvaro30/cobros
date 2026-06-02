import { Controller, Post } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('test')
  async testReport() {
    await this.reportsService.generateDailyReport();
    return { message: 'Test report generated and queued for sending.' };
  }
}
