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
  StreamableFile,
  Res,
} from '@nestjs/common';
import { GoogleDriveService, DriveFile } from './google-drive.service';
import type { Response } from 'express';
import { DocumentProcessorService } from '../documents/document-processor.service';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  count?: number;
  query?: string;
  message?: string;
  error?: string;
}

interface FileProcessingResult {
  fileId: string;
  fileName: string;
  mimeType: string;
  size: number;
  processed: boolean;
  chunks?: number;
  error?: string;
}

interface BatchProcessingResult {
  totalFiles: number;
  processed: number;
  failed: number;
  results: FileProcessingResult[];
}

interface ExportRequest {
  fileId: string;
  format: string;
}

interface DownloadRequest {
  fileId: string;
}

@Controller('google-drive')
export class GoogleDriveController {
  private readonly logger = new Logger(GoogleDriveController.name);

  constructor(
    private readonly googleDriveService: GoogleDriveService,
    private readonly documentProcessorService: DocumentProcessorService
  ) {}

  /**
   * List files from Google Drive
   */

  @Post('files/ulpoad/docs')
  async uploadDocsToRag(@Body() body: ExportRequest): Promise<
    ApiResponse<{
      fileId: string;
      originalFormat: string;
      exportedFormat: string;
      size: number;
    }>
  > {
    try {
      const { fileId, format } = body;

      if (!fileId || !format) {
        throw new HttpException(
          'File ID and format are required',
          HttpStatus.BAD_REQUEST
        );
      }

      const metaData = await this.googleDriveService.getMetadata(fileId);
      console.log('filecontet', metaData);

      if (
        !metaData.mimeType.startsWith('application/vnd.google-apps.document')
      ) {
        throw new HttpException(
          'File is not a Google Workspace document and cannot be exported',
          HttpStatus.BAD_REQUEST
        );
      }

      const exportedBuffer = await this.googleDriveService.exportFile(
        fileId,
        format
      );

      this.documentProcessorService.processPdf(exportedBuffer, metaData.name);

      return {
        success: true,
        message: 'File processed successfully',
      };
    } catch (error) {
      this.logger.error('Failed to export file', error);
      throw new HttpException(
        'Failed to export file',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('files/upload/pdf')
  async uploadPdfToRag(@Body() body: DownloadRequest): Promise<StreamableFile> {
    const { fileId } = body;
    try {
      if (!fileId || fileId.trim().length === 0) {
        throw new HttpException('File ID is required', HttpStatus.BAD_REQUEST);
      }

      const fileContent = await this.googleDriveService.getFileContent(
        fileId.trim()
      );

      await this.documentProcessorService.processPdf(
        fileContent.content,
        fileContent.metadata.name
      );

      return new StreamableFile(fileContent.content);
    } catch (error) {
      this.logger.error(`Failed to download file ${fileId}`, error);
      throw new HttpException(
        'Failed to download file from Google Drive',
        HttpStatus.NOT_FOUND
      );
    }
  }

  @Get('files')
  async listFiles(
    @Query('folderId') folderId?: string,
    @Query('pageSize') pageSize?: string,
    @Query('mimeType') mimeType?: string,
    @Query('processableOnly') processableOnly?: string
  ): Promise<ApiResponse<DriveFile[]>> {
    try {
      this.logger.log(
        `Listing files - folderId: ${folderId}, pageSize: ${pageSize}, mimeType: ${mimeType}`
      );

      const parsedPageSize = pageSize ? parseInt(pageSize, 10) : 100;
      if (
        isNaN(parsedPageSize) ||
        parsedPageSize < 1 ||
        parsedPageSize > 1000
      ) {
        throw new HttpException(
          'Page size must be a number between 1 and 1000',
          HttpStatus.BAD_REQUEST
        );
      }

      let files: DriveFile[];

      if (processableOnly === 'true') {
        files = await this.googleDriveService.getProcessableFiles(folderId);
      } else {
        files = await this.googleDriveService.listFiles(
          folderId,
          parsedPageSize,
          mimeType
        );
      }

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

  /**
   * Get processable files only
   */
  @Get('files/processable')
  async getProcessableFiles(
    @Query('folderId') folderId?: string
  ): Promise<ApiResponse<DriveFile[]>> {
    try {
      const files = await this.googleDriveService.getProcessableFiles(folderId);

      return {
        success: true,
        data: files,
        count: files.length,
        message: `Found ${files.length} processable files`,
      };
    } catch (error) {
      this.logger.error('Failed to get processable files', error);
      throw new HttpException(
        'Failed to retrieve processable files',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Search files in Google Drive
   */
  @Get('files/search')
  async searchFiles(
    @Query('q') query: string,
    @Query('pageSize') pageSize?: string
  ): Promise<ApiResponse<DriveFile[]>> {
    try {
      if (!query || query.trim().length === 0) {
        throw new HttpException(
          'Query parameter is required and cannot be empty',
          HttpStatus.BAD_REQUEST
        );
      }

      const parsedPageSize = pageSize ? parseInt(pageSize, 10) : 50;
      if (
        isNaN(parsedPageSize) ||
        parsedPageSize < 1 ||
        parsedPageSize > 1000
      ) {
        throw new HttpException(
          'Page size must be a number between 1 and 1000',
          HttpStatus.BAD_REQUEST
        );
      }

      const files = await this.googleDriveService.searchFiles(
        query.trim(),
        parsedPageSize
      );

      return {
        success: true,
        data: files,
        count: files.length,
        query: query.trim(),
      };
    } catch (error) {
      this.logger.error('Failed to search files', error);
      throw new HttpException(
        'Failed to search files in Google Drive',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get file metadata and content info
   */
  @Get('files/:fileId')
  async getFileInfo(@Param('fileId') fileId: string): Promise<
    ApiResponse<{
      metadata: DriveFile;
      contentSize: number;
      isProcessable: boolean;
    }>
  > {
    try {
      if (!fileId || fileId.trim().length === 0) {
        throw new HttpException('File ID is required', HttpStatus.BAD_REQUEST);
      }

      const fileContent = await this.googleDriveService.getFileContent(
        fileId.trim()
      );
      const isProcessable = this.googleDriveService.isProcessableFile(
        fileContent.metadata.mimeType
      );

      return {
        success: true,
        data: {
          metadata: fileContent.metadata,
          contentSize: fileContent.content.length,
          isProcessable,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get file info for ${fileId}`, error);

      throw new HttpException(
        'Failed to retrieve file from Google Drive',
        HttpStatus.NOT_FOUND
      );
    }
  }

  /**
   * Download file content
   */
  @Get('files/:fileId/download')
  async downloadFile(
    @Param('fileId') fileId: string,
    @Res({ passthrough: true }) res: Response
  ): Promise<StreamableFile> {
    try {
      if (!fileId || fileId.trim().length === 0) {
        throw new HttpException('File ID is required', HttpStatus.BAD_REQUEST);
      }

      const fileContent = await this.googleDriveService.getFileContent(
        fileId.trim()
      );

      // Set appropriate headers
      res.set({
        'Content-Type': fileContent.metadata.mimeType,
        'Content-Disposition': `attachment; filename="${fileContent.metadata.name}"`,
        'Content-Length': fileContent.content.length.toString(),
      });

      return new StreamableFile(fileContent.content);
    } catch (error) {
      this.logger.error(`Failed to download file ${fileId}`, error);
      throw new HttpException(
        'Failed to download file from Google Drive',
        HttpStatus.NOT_FOUND
      );
    }
  }

  /**
   * Export Google Workspace files to different formats
   */
  @Post('files/export')
  async exportFile(@Body() body: ExportRequest): Promise<
    ApiResponse<{
      fileId: string;
      originalFormat: string;
      exportedFormat: string;
      size: number;
    }>
  > {
    try {
      const { fileId, format } = body;

      if (!fileId || !format) {
        throw new HttpException(
          'File ID and format are required',
          HttpStatus.BAD_REQUEST
        );
      }

      // Get file metadata first to check if it's a Google Workspace file
      const metaData = await this.googleDriveService.getMetadata(fileId);
      console.log('filecontet', metaData);

      if (
        !metaData.mimeType.startsWith('application/vnd.google-apps.document')
      ) {
        throw new HttpException(
          'File is not a Google Workspace document and cannot be exported',
          HttpStatus.BAD_REQUEST
        );
      }

      const exportedContent = await this.googleDriveService.exportFile(
        fileId,
        format
      );

      return {
        success: true,
        data: {
          fileId,
          originalFormat: metaData.mimeType,
          exportedFormat: format,
          size: exportedContent.length,
        },
        message: 'File exported successfully',
      };
    } catch (error) {
      this.logger.error('Failed to export file', error);
      throw new HttpException(
        'Failed to export file',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Health check endpoint
   */
  @Get('health')
  async healthCheck(): Promise<
    ApiResponse<{ status: string; timestamp: string }>
  > {
    try {
      // Test Google Drive connection
      await this.googleDriveService.listFiles(undefined, 1);

      return {
        success: true,
        data: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
        },
        message: 'Google Drive service is operational',
      };
    } catch (error) {
      this.logger.error('Health check failed', error);
      throw new HttpException(
        'Google Drive service is unavailable',
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }
}
