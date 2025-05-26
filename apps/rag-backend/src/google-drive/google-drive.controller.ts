import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Body,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { GoogleDriveService } from './google-drive.service';
import { DocumentProcessorService } from '../documents/document-processor.service';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  count?: number;
  query?: string;
  totalProcessed?: number;
  totalChunks?: number;
  message?: string;
}

interface FileListResponse {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  modifiedTime: string;
  webViewLink: string;
}

interface ProcessedFileResponse {
  id: string;
  name: string;
  metadata: {
    source: string;
    fileId: string;
    mimeType: string;
    size: number;
    modifiedTime: string;
    webViewLink: string;
  };
  chunksCount: number;
  contentLength: number;
  preview?: string;
}

@Controller('google-drive')
export class GoogleDriveController {
  private readonly logger = new Logger(GoogleDriveController.name);

  constructor(
    private readonly googleDriveService: GoogleDriveService,
    private readonly documentProcessorService: DocumentProcessorService
  ) {}

  @Get('files')
  async listFiles(
    @Query('folderId') folderId?: string,
    @Query('pageSize') pageSize?: string,
    @Query('mimeType') mimeType?: string
  ): Promise<ApiResponse<FileListResponse[]>> {
    try {
      const files = await this.googleDriveService.listFiles(
        folderId,
        pageSize ? parseInt(pageSize) : 100,
        mimeType
      );
      return {
        success: true,
        data: files,
        count: files.length,
      };
    } catch (error) {
      this.logger.error('Failed to list files', error);
      throw new HttpException(
        'Failed to retrieve files from Google Drive',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('files/processable')
  async getProcessableFiles(
    @Query('folderId') folderId?: string
  ): Promise<ApiResponse<FileListResponse[]>> {
    try {
      const files = await this.googleDriveService.getProcessableFiles(folderId);
      return {
        success: true,
        data: files,
        count: files.length,
      };
    } catch (error) {
      this.logger.error('Failed to get processable files', error);
      throw new HttpException(
        'Failed to retrieve processable files',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('files/search')
  async searchFiles(
    @Query('q') query: string,
    @Query('pageSize') pageSize?: string
  ): Promise<ApiResponse<FileListResponse[]>> {
    try {
      if (!query) {
        throw new HttpException(
          'Query parameter is required',
          HttpStatus.BAD_REQUEST
        );
      }

      const files = await this.googleDriveService.searchFiles(
        query,
        pageSize ? parseInt(pageSize) : 50
      );

      return {
        success: true,
        data: files,
        count: files.length,
        query,
      };
    } catch (error) {
      this.logger.error('Failed to search files', error);
      throw new HttpException(
        'Failed to search files in Google Drive',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('files/:fileId')
  async getFile(
    @Param('fileId') fileId: string
  ): Promise<ApiResponse<{ metadata: FileListResponse; contentSize: number }>> {
    try {
      const fileContent = await this.googleDriveService.getFileContent(fileId);
      return {
        success: true,
        data: {
          metadata: fileContent.metadata,
          contentSize: fileContent.content.length,
          // Don't return raw content in API response, just metadata
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get file ${fileId}`, error);
      throw new HttpException(
        'Failed to retrieve file from Google Drive',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('process/file/:fileId')
  async processFile(
    @Param('fileId') fileId: string
  ): Promise<ApiResponse<ProcessedFileResponse>> {
    try {
      const processedDoc =
        await this.documentProcessorService.processGoogleDriveFile(fileId);
      return {
        success: true,
        data: {
          id: processedDoc.id,
          name: processedDoc.name,
          metadata: processedDoc.metadata,
          chunksCount: processedDoc.chunks.length,
          contentLength: processedDoc.content.length,
          // Return first chunk as preview
          preview: processedDoc.chunks[0]?.content.substring(0, 200) + '...',
        },
      };
    } catch (error) {
      this.logger.error(`Failed to process file ${fileId}`, error);
      throw new HttpException(
        'Failed to process file for RAG',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('process/folder')
  async processFolder(
    @Body() body: { folderId?: string }
  ): Promise<ApiResponse<ProcessedFileResponse[]>> {
    try {
      const processedDocs =
        await this.documentProcessorService.processFolderFiles(body.folderId);

      return {
        success: true,
        data: processedDocs.map((doc) => ({
          id: doc.id,
          name: doc.name,
          metadata: doc.metadata,
          chunksCount: doc.chunks.length,
          contentLength: doc.content.length,
        })),
        totalProcessed: processedDocs.length,
        totalChunks: processedDocs.reduce(
          (sum, doc) => sum + doc.chunks.length,
          0
        ),
      };
    } catch (error) {
      this.logger.error('Failed to process folder', error);
      throw new HttpException(
        'Failed to process folder for RAG',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('process/search')
  async processSearchResults(
    @Body() body: { query: string }
  ): Promise<ApiResponse<ProcessedFileResponse[]>> {
    try {
      if (!body.query) {
        throw new HttpException('Query is required', HttpStatus.BAD_REQUEST);
      }

      const processedDocs =
        await this.documentProcessorService.searchAndProcessFiles(body.query);

      return {
        success: true,
        data: processedDocs.map((doc) => ({
          id: doc.id,
          name: doc.name,
          metadata: doc.metadata,
          chunksCount: doc.chunks.length,
          contentLength: doc.content.length,
        })),
        query: body.query,
        totalProcessed: processedDocs.length,
        totalChunks: processedDocs.reduce(
          (sum, doc) => sum + doc.chunks.length,
          0
        ),
      };
    } catch (error) {
      this.logger.error('Failed to process search results', error);
      throw new HttpException(
        'Failed to process search results for RAG',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('auth/callback')
  async handleAuthCallback(@Body() body: { code: string }): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // Handle OAuth callback if using OAuth 2.0
      // This would typically exchange the code for tokens
      // and store them for the user session

      return {
        success: true,
        message: 'Authentication successful',
      };
    } catch (error) {
      this.logger.error('Failed to handle auth callback', error);
      throw new HttpException(
        'Authentication failed',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
