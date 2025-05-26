import { Injectable, Logger } from '@nestjs/common';
import { google, drive_v3 } from 'googleapis';
import { GoogleAuth, OAuth2Client} from 'google-auth-library';
import { Readable } from 'stream';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  modifiedTime: string;
  webViewLink: string;
}

export interface DriveFileContent {
  content: Buffer;
  metadata: DriveFile;
}

// Type guard functions
function isValidFile(
  file: drive_v3.Schema$File | null | undefined
): file is drive_v3.Schema$File {
  return Boolean(file && typeof file.id === 'string' && file.id.length > 0);
}

function sanitizeFileData(file: drive_v3.Schema$File): DriveFile {
  return {
    id: file.id || '',
    name: file.name || 'Unknown File',
    mimeType: file.mimeType || 'application/octet-stream',
    size: file.size ? parseInt(file.size.toString()) : 0,
    modifiedTime: file.modifiedTime || new Date().toISOString(),
    webViewLink: file.webViewLink || '',
  };
}

// Helper function to convert stream to buffer
async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];

  return new Promise((resolve, reject) => {
    stream.on('data', (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    stream.on('end', () => {
      resolve(Buffer.concat(chunks));
    });

    stream.on('error', (error: Error) => {
      reject(error);
    });
  });
}

@Injectable()
export class GoogleDriveService {
  private readonly logger = new Logger(GoogleDriveService.name);
  private drive!: drive_v3.Drive; // Use definite assignment assertion
  private auth!: GoogleAuth; // Use definite assignment assertion

  constructor() {
    this.initializeGoogleDrive();
  }

  private async initializeGoogleDrive() {
    try {
      // Initialize Google Auth
     // More explicit approach
    const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE,
   scopes: [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/drive.metadata.readonly',
  ],
});

this.drive = google.drive({ version: 'v3', auth });

      // Test the connection
      await this.testConnection();
    } catch (error) {
      this.logger.error('Failed to initialize Google Drive API', error);
      throw error;
    }
  }

  private async testConnection() {
    try {
      await this.drive.about.get({ fields: 'user' });
      this.logger.log('Google Drive API connection successful');
    } catch (error) {
      this.logger.error('Google Drive API connection test failed', error);
      throw error;
    }
  }

  // Set OAuth tokens (if using OAuth 2.0)
  async setCredentials(tokens: {
    access_token?: string;
    refresh_token?: string;
    scope?: string;
    token_type?: string;
    expiry_date?: number;
  }): Promise<void> {
    try {
      const authClient = await this.auth.getClient();
      if (authClient instanceof OAuth2Client) {
        authClient.setCredentials(tokens);
      }
    } catch (error) {
      this.logger.error('Failed to set credentials', error);
      throw error;
    }
  }

  // List files in Google Drive
  async listFiles(
    folderId?: string,
    pageSize = 100, // Remove explicit type annotation
    mimeType?: string
  ): Promise<DriveFile[]> {
    try {
      let query = 'trashed=false';

      if (folderId) {
        query += ` and '${folderId}' in parents`;
      }

      if (mimeType) {
        query += ` and mimeType='${mimeType}'`;
      }

      const response = await this.drive.files.list({
        q: query,
        pageSize,
        fields: 'files(id,name,mimeType,size,modifiedTime,webViewLink)',
        orderBy: 'modifiedTime desc',
      });

      const files = response.data.files || [];
      return files.filter(isValidFile).map(sanitizeFileData);
    } catch (error) {
      this.logger.error('Failed to list files from Google Drive', error);
      throw error;
    }
  }

  // Get file content
  async getFileContent(fileId: string): Promise<DriveFileContent> {
    try {
      // Get file metadata
      const metadataResponse = await this.drive.files.get({
        fileId,
        fields: 'id,name,mimeType,size,modifiedTime,webViewLink',
      });

      const metadata = metadataResponse.data;
      if (!metadata.id) {
        throw new Error('File not found or inaccessible');
      }

      // Get file content
      const contentResponse = await this.drive.files.get(
        {
          fileId,
          alt: 'media',
        },
        { responseType: 'stream' }
      );

      // Convert stream to buffer - the response.data should be a Readable stream
      const content = await streamToBuffer(contentResponse.data as Readable);

      return {
        content,
        metadata: sanitizeFileData({
          id: metadata.id,
          name: metadata.name,
          mimeType: metadata.mimeType,
          size: metadata.size,
          modifiedTime: metadata.modifiedTime,
          webViewLink: metadata.webViewLink,
        }),
      };
    } catch (error) {
      this.logger.error(`Failed to get file content for ${fileId}`, error);
      throw error;
    }
  }

  // Export Google Docs/Sheets/Slides to different formats
  async exportFile(fileId: string, mimeType: string): Promise<Buffer> {
    try {
      const response = await this.drive.files.export(
        {
          fileId,
          mimeType,
        },
        { responseType: 'stream' }
      );

      return await streamToBuffer(response.data as Readable);
    } catch (error) {
      this.logger.error(`Failed to export file ${fileId}`, error);
      throw error;
    }
  }

  // Search files by query
  async searchFiles(
    query: string,
    pageSize = 50 // Remove explicit type annotation
  ): Promise<DriveFile[]> {
    try {
      const response = await this.drive.files.list({
        q: `name contains '${query}' and trashed=false`,
        pageSize,
        fields: 'files(id,name,mimeType,size,modifiedTime,webViewLink)',
        orderBy: 'relevance desc',
      });

      const files = response.data.files || [];
      return files.filter(isValidFile).map(sanitizeFileData);
    } catch (error) {
      this.logger.error('Failed to search files', error);
      throw error;
    }
  }

  // Get files by specific folder
  async getFilesByFolder(folderId: string): Promise<DriveFile[]> {
    return this.listFiles(folderId);
  }

  // Check if file is processable for RAG
  isProcessableFile(mimeType: string): boolean {
    const processableMimeTypes = [
      'text/plain',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.google-apps.document',
      'application/vnd.google-apps.spreadsheet',
      'application/vnd.google-apps.presentation',
      'text/csv',
      'application/json',
      'text/markdown',
    ];

    return processableMimeTypes.includes(mimeType);
  }

  // Get processable files only
  async getProcessableFiles(folderId?: string): Promise<DriveFile[]> {
    const allFiles = await this.listFiles(folderId);
    return allFiles.filter((file) => this.isProcessableFile(file.mimeType));
  }
}