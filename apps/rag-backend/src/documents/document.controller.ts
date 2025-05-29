import {
  BadRequestException,
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

  @Post('upload/pdf')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException(
        'Invalid file type. Only .pdf files are allowed.'
      );
    }

    await this.documentProcessorService.processPdf(
      file.buffer,
      file.originalname
    );
  }

  @Post('upload/txt')
  @UseInterceptors(FileInterceptor('file'))
  async uploadTxt(@UploadedFile() file: Express.Multer.File) {
    if (file.mimetype !== 'text/plain') {
      throw new BadRequestException(
        'Invalid file type. Only .txt files are allowed.'
      );
    }

    await this.documentProcessorService.processTxt(file);

    return {
      file: file,
    };
  }

  @Post('upload/docx')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocx(@UploadedFile() file: Express.Multer.File) {
    if (
      file.mimetype !==
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      throw new BadRequestException(
        'Invalid file type. Only .docx files are allowed.'
      );
    }

    await this.documentProcessorService.processDOCX(file);
    return {
      file: file,
    };
  }
}
