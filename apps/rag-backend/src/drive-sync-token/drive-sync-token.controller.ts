import { Controller, Post, Get } from '@nestjs/common';
import { DriveSyncScheduler } from '../drive-sync-scheduler/drive-sync-scheduler.service';
@Controller('drive-sync')
export class DriveSyncController {
  constructor(private readonly syncScheduler: DriveSyncScheduler) {}

  @Post('trigger')
  async triggerSync() {
    return await this.syncScheduler.triggerManualSync();
  }

  @Get('status')
  async getSyncStatus() {
    // Du kan udvide dette til at vise sync status
    return {
      message: 'Sync service is running',
      timestamp: new Date(),
    };
  }
}
