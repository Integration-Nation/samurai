import { Module } from '@nestjs/common';
import { DriveSyncTokenService } from './drive-sync-token.service';
import { DriveSyncController } from './drive-sync-token.controller';
import { DriveSyncScheduler } from '../drive-sync-scheduler/drive-sync-scheduler.service';
import { GoogleDriveService } from '../google-drive/google-drive.service';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Document } from '../documents/entities/document.entity';
import { DriveSyncToken } from '../documents/entities/driveSyncToken.entity';
import { DocumentModule } from '../documents/document.module';
import { GoogleDriveModule } from '../google-drive/google-drive.module';

@Module({
  imports: [
    MikroOrmModule.forFeature([Document, DriveSyncToken]),
    DocumentModule,
    GoogleDriveModule,
  ],

  controllers: [DriveSyncController],
  providers: [DriveSyncScheduler, DriveSyncTokenService, GoogleDriveService],
  exports: [DriveSyncScheduler],
})
export class DriveSyncTokenModule {}
