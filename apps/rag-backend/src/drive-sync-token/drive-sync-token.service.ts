import { EntityRepository } from '@mikro-orm/postgresql';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Document } from '../documents/entities/document.entity';
import { DriveSyncToken } from '../documents/entities/driveSyncToken.entity';
import { drive_v3, google } from 'googleapis';
import { DocumentProcessorService } from '../documents/document-processor.service';
import { streamToBuffer } from '../google-drive/google-drive.service';
import { InjectRepository } from '@mikro-orm/nestjs';

@Injectable()
export class DriveSyncTokenService implements OnModuleInit {
  private readonly logger = new Logger(DriveSyncTokenService.name);
  private drive!: drive_v3.Drive;

  constructor(
    @InjectRepository(Document)
    private readonly documentRepo: EntityRepository<Document>,

    @InjectRepository(DriveSyncToken)
    private readonly driveSyncTokenRepository: EntityRepository<DriveSyncToken>,

    private readonly documentProcessorService: DocumentProcessorService
  ) {}

  async onModuleInit() {
    await this.initializeGoogleDrive();
  }

  private async initializeGoogleDrive() {
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE,
      scopes: [
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/drive.metadata.readonly',
      ],
    });
    this.drive = google.drive({ version: 'v3', auth });
    this.logger.log('Google Drive client initialized');
  }

  async syncRecentChanges(): Promise<void> {
    // Find eksisterende token
    const tokens = await this.driveSyncTokenRepository.findAll();
    let tokenEntity = tokens[0];
    if (!tokenEntity) {
      this.logger.warn('No startPageToken found, creating a new one...');
      const newToken = await this.getStartPageToken();
      tokenEntity = this.driveSyncTokenRepository.create({ token: newToken });
      await this.driveSyncTokenRepository
        .getEntityManager()
        .persistAndFlush(tokenEntity);
      this.logger.log('New startPageToken saved to database.');
      return;
    }

    try {
      // Hent ændringer fra Google Drive siden sidst gemte token
      const newToken = await this.fetchChanges(tokenEntity.token);

      if (newToken) {
        tokenEntity.token = newToken;
        await this.driveSyncTokenRepository
          .getEntityManager()
          .persistAndFlush(tokenEntity);
        this.logger.log('Updated startPageToken in database.');
      } else {
        this.logger.log('No new changes found since last sync.');
      }
    } catch (err) {
      this.logger.error('Failed to sync changes from Google Drive', err);
      throw err;
    }
  }

  async getStartPageToken(): Promise<string> {
    const res = await this.drive.changes.getStartPageToken({});
    if (!res.data.startPageToken) {
      throw new Error('Failed to retrieve startPageToken');
    }
    return res.data.startPageToken;
  }

  private async fetchChanges(savedToken: string): Promise<string | null> {
    let pageToken = savedToken;
    let newStartPageToken: string | undefined;

    do {
      const response = await this.drive.changes.list({
        pageToken,
        fields: 'changes(fileId,removed),newStartPageToken,nextPageToken',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });

      const changes = response.data.changes || [];

      for (const change of changes) {
        if (change.removed) {
          this.logger.log(`File deleted: ${change.fileId}`);
          // Slet dokumentet fra databasen
          await this.documentRepo.nativeDelete({ driveFileId: change.fileId });
        } else if (change.fileId) {
          // Hent metadata for filen
          const fileMetadata = await this.drive.files.get({
            fileId: change.fileId,
            fields: 'id, name, mimeType, modifiedTime',
            supportsAllDrives: true,
          });

          const { mimeType, name } = fileMetadata.data;

          if (!name) {
            this.logger.warn(
              `File with ID ${change.fileId} has no name, skipping processing.`
            );
            continue;
          }

          if (mimeType === 'application/pdf' || name.endsWith('.pdf')) {
            // Hent filindhold som stream
            const fileStreamResponse = await this.drive.files.get(
              { fileId: change.fileId, alt: 'media' },
              { responseType: 'stream' }
            );

            const fileBuffer = await streamToBuffer(fileStreamResponse.data);

            // Processér PDF'en
            await this.documentProcessorService.processPdf(fileBuffer, name);
            this.logger.log(`Processed PDF file: ${name}`);
          } else {
            this.logger.log(
              `File ${name} with mimeType ${mimeType} is not a PDF, skipping.`
            );
          }
        }
      }

      newStartPageToken = response.data.newStartPageToken ?? newStartPageToken;
      pageToken = response.data.nextPageToken || '';
    } while (pageToken);

    return newStartPageToken || null;
  }

  async cleanupDeletedFiles(): Promise<void> {
    this.logger.log('Cleanup not yet implemented.');
    // TODO: Implementér hvis nødvendigt
  }
}
