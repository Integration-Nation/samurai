import {
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { DocumentService } from './document.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('document')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}
  @Get()
  async findAll() {
    return await this.documentService.findAll();
  }

  @Get('to-vector')
  async generateEmbedding() {
    const text = `She wanna fuck, let's make up
Ex got a problеm, tell him say somethin' (Schyeah)
Housе in the hills, we can lay up (Schyeah)
Bae, you could stay, we could play fun
She don't do much, just lie
Anything she want, I can get it done
Hundred thousand racks in the bando (Schyeah)
Hundred thousand racks in the bando
She want a break and I get that
She tryna leave, told me she— uh
Said that she leavin', she wanna— uh
I'm off a bean, it's gettin' me— uh
She bend right back then we bool`;

    const embedding = await this.documentService.generateEmbedding(text);
    return embedding;
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    await this.documentService.processPdf(file);
  }

  @Get('similarity-test')
  async testSimilarity(@Body() body: { prompt: string }) {
    const similarDocs =
      await this.documentService.retrieveSimilarDocumentChunks(body.prompt);
    const rerankedResults = await this.documentService.rerankWithCohere(
      body.prompt,
      similarDocs,
      5,
    );
    return this.documentService.generateResponse(body.prompt, rerankedResults);
  }
}
