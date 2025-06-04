import { Module } from '@nestjs/common';
import { GoogleDriveService } from './google-drive.service';
import { GoogleDriveController } from './google-drive.controller';
import { DocumentModule } from '../documents/document.module';

@Module({
  imports: [DocumentModule],
  providers: [GoogleDriveService],
  controllers: [GoogleDriveController],
  exports: [GoogleDriveService],
})
export class GoogleDriveModule {}
