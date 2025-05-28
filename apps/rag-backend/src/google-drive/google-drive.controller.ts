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
import { log } from 'console';

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

@Controller('google-drive')
export class GoogleDriveController {
  private readonly logger = new Logger(GoogleDriveController.name);

  constructor(private readonly googleDriveService: GoogleDriveService) {}

  /**
   * List files from Google Drive
   */

  @Get('test-drive-files')
  async testFiles() {
    const files = await this.googleDriveService.listFiles();
    return files;
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
      const fileContent = await this.googleDriveService.getFileContent(fileId);
      console.log('filecontet', fileContent);

      if (
        !fileContent.metadata.mimeType.startsWith(
          'application/vnd.google-apps.document'
        )
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
          originalFormat: fileContent.metadata.mimeType,
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
   * Process a single file for RAG (extract text content)
   */
  @Post('files/:fileId/process')
  async processFile(@Param('fileId') fileId: string): Promise<
    ApiResponse<{
      fileId: string;
      fileName: string;
      contentPreview: string;
      contentLength: number;
      textExtracted: boolean;
      chunks: string[];
    }>
  > {
    try {
      if (!fileId || fileId.trim().length === 0) {
        throw new HttpException('File ID is required', HttpStatus.BAD_REQUEST);
      }

      const fileContent = await this.googleDriveService.getFileContent(
        fileId.trim()
      );

      if (
        !this.googleDriveService.isProcessableFile(
          fileContent.metadata.mimeType
        )
      ) {
        throw new HttpException(
          `File type ${fileContent.metadata.mimeType} is not processable`,
          HttpStatus.BAD_REQUEST
        );
      }

      // Basic text extraction (you can enhance this based on file type)
      let textContent = '';

      if (fileContent.metadata.mimeType === 'text/plain') {
        textContent = fileContent.content.toString('utf-8');
      } else if (fileContent.metadata.mimeType === 'application/json') {
        textContent = fileContent.content.toString('utf-8');
      } else {
        // For other formats, you'd typically use specialized libraries
        textContent = fileContent.content.toString('utf-8');
      }

      // Simple chunking (split by paragraphs or every 1000 characters)
      const chunks = this.chunkText(textContent);

      return {
        success: true,
        data: {
          fileId,
          fileName: fileContent.metadata.name,
          contentPreview:
            textContent.substring(0, 500) +
            (textContent.length > 500 ? '...' : ''),
          contentLength: textContent.length,
          textExtracted: true,
          chunks: chunks.slice(0, 5), // Return first 5 chunks as preview
        },
        message: `File processed successfully. Generated ${chunks.length} chunks.`,
      };
    } catch (error) {
      this.logger.error(`Failed to process file ${fileId}`, error);
      throw new HttpException(
        'Failed to process file for RAG',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Batch process multiple files
   */
  @Post('files/batch-process')
  async batchProcessFiles(
    @Body() body: { fileIds: string[] }
  ): Promise<ApiResponse<BatchProcessingResult>> {
    try {
      const { fileIds } = body;

      if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
        throw new HttpException(
          'File IDs array is required and cannot be empty',
          HttpStatus.BAD_REQUEST
        );
      }

      if (fileIds.length > 50) {
        throw new HttpException(
          'Cannot process more than 50 files at once',
          HttpStatus.BAD_REQUEST
        );
      }

      const results: FileProcessingResult[] = [];
      let processed = 0;
      let failed = 0;

      for (const fileId of fileIds) {
        try {
          const fileContent = await this.googleDriveService.getFileContent(
            fileId
          );

          if (
            this.googleDriveService.isProcessableFile(
              fileContent.metadata.mimeType
            )
          ) {
            // Simulate processing
            const textContent = fileContent.content.toString('utf-8');
            const chunks = this.chunkText(textContent);

            results.push({
              fileId,
              fileName: fileContent.metadata.name,
              mimeType: fileContent.metadata.mimeType,
              size: fileContent.metadata.size,
              processed: true,
              chunks: chunks.length,
            });
            processed++;
          } else {
            results.push({
              fileId,
              fileName: fileContent.metadata.name,
              mimeType: fileContent.metadata.mimeType,
              size: fileContent.metadata.size,
              processed: false,
              error: 'File type not processable',
            });
            failed++;
          }
        } catch (error) {
          results.push({
            fileId,
            fileName: 'Unknown',
            mimeType: 'Unknown',
            size: 0,
            processed: false,
            error: 'Failed to process file',
          });
          failed++;
        }
      }

      return {
        success: true,
        data: {
          totalFiles: fileIds.length,
          processed,
          failed,
          results,
        },
        message: `Batch processing completed. ${processed} processed, ${failed} failed.`,
      };
    } catch (error) {
      this.logger.error('Failed to batch process files', error);
      throw new HttpException(
        'Failed to batch process files',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Process all files in a folder
   */
  @Post('folders/:folderId/process')
  async processFolderFiles(
    @Param('folderId') folderId: string
  ): Promise<ApiResponse<BatchProcessingResult>> {
    try {
      if (!folderId || folderId.trim().length === 0) {
        throw new HttpException(
          'Folder ID is required',
          HttpStatus.BAD_REQUEST
        );
      }

      const files = await this.googleDriveService.getProcessableFiles(
        folderId.trim()
      );

      if (files.length === 0) {
        return {
          success: true,
          data: {
            totalFiles: 0,
            processed: 0,
            failed: 0,
            results: [],
          },
          message: 'No processable files found in folder',
        };
      }

      const fileIds = files.map((file) => file.id);

      // Reuse the batch processing logic
      const response = await this.batchProcessFiles({ fileIds });

      return {
        ...response,
        message: `Folder processing completed. ${response.data?.processed} processed, ${response.data?.failed} failed.`,
      };
    } catch (error) {
      this.logger.error(`Failed to process folder ${folderId}`, error);
      throw new HttpException(
        'Failed to process folder files',
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

  /**
   * Helper method to chunk text content
   */
  private chunkText(text: string, chunkSize = 1000, overlap = 100): string[] {
    if (!text || text.length === 0) {
      return [];
    }

    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      let end = start + chunkSize;

      // If we're not at the end of the text, try to break at a sentence or word boundary
      if (end < text.length) {
        const lastPeriod = text.lastIndexOf('.', end);
        const lastSpace = text.lastIndexOf(' ', end);

        if (lastPeriod > start + chunkSize * 0.5) {
          end = lastPeriod + 1;
        } else if (lastSpace > start + chunkSize * 0.5) {
          end = lastSpace;
        }
      }

      chunks.push(text.substring(start, end).trim());
      start = end - overlap;
    }

    return chunks.filter((chunk) => chunk.length > 0);
  }
}
