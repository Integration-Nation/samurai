import {
  Controller,
  Get,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { DocumentProcessorService } from './document-processor.service';
import { FileInterceptor } from '@nestjs/platform-express';

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
}
