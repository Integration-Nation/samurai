// drive-sync.scheduler.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DriveSyncTokenService } from '../drive-sync-token/drive-sync-token.service';

@Injectable()
export class DriveSyncScheduler {
  private readonly logger = new Logger(DriveSyncScheduler.name);

  constructor(private readonly driveSynctokenService: DriveSyncTokenService) {}

  @Cron('*/1 * * * *')
  async handleRegularSync() {
    try {
      this.logger.log('⏳ Starting regular Google Drive sync...');
      await this.driveSynctokenService.syncRecentChanges();
      this.logger.log('✅ Sync completed.');
    } catch (error) {
      this.logger.error('❌ Regular sync failed:', error);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleCleanup() {
    try {
      this.logger.log('🧹 Cleaning up deleted files...');
      await this.driveSynctokenService.cleanupDeletedFiles();
    } catch (error) {
      this.logger.error('❌ Cleanup failed:', error);
    }
  }

  async triggerManualSync(): Promise<{ message: string; timestamp: Date }> {
    try {
      await this.driveSynctokenService.syncRecentChanges();
      return {
        message: 'Manual sync completed successfully',
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Manual sync failed:', error);
      throw error;
    }
  }
}
