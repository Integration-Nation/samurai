import {
  Controller,
  Get,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { DocumentProcessorService } from './document-processor.service';
import { FileInterceptor } from '@nestjs/platform-express';
import mammoth from 'mammoth';

@Controller('document')
export class DocumentController {
  constructor(
    private readonly documentProcessorService: DocumentProcessorService
  ) {}
  @Get()
  async findAll() {
    return await this.documentProcessorService.findAll();
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    await this.documentProcessorService.processPdf(file);
  }

  @Post('upload/txt')
  @UseInterceptors(FileInterceptor('file'))
  async uploadTxt(@UploadedFile() file: Express.Multer.File) {
    const content = file.buffer.toString('utf-8');

    // Example: parse each line
    const lines = content.split('\n').map((line) => line.trim());

    return {
      originalName: file.originalname,
      lineCount: lines.length,
      lines,
    };
  }

  @Post('upload/docx')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocx(@UploadedFile() file: Express.Multer.File) {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    const text = result.value; // Plain text content
    return {
      originalName: file.originalname,
      wordCount: text.split(/\s+/).length,
      content: text,
    };
  }
}
