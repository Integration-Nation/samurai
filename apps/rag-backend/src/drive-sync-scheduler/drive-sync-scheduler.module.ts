import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { DriveSyncController } from '../drive-sync-token/drive-sync-token.controller';
import { DriveSyncScheduler } from './drive-sync-scheduler.service';
import { DriveSyncTokenService } from '../drive-sync-token/drive-sync-token.service';
import { DriveSyncToken } from '../documents/entities/driveSyncToken.entity';

Module({
  imports: [
    MikroOrmModule.forFeature([DriveSyncToken]), // her skal entity-klassen ind
  ],
  controllers: [DriveSyncController],
  providers: [DriveSyncScheduler, DriveSyncTokenService],
  exports: [DriveSyncScheduler],
});
export class DriveSyncSchedulerModule {}
