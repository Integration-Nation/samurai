import { Module } from '@nestjs/common';
import { DocumentController } from './document.controller';
import { DocumentProcessorService } from './document-processor.service';
import { Document } from './entities/document.entity';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { DocumentVector } from '../vector-store/entities/document-vector.entity';
import { RagModule } from '../rag/rag.module';
import { EmbeddingsModule } from '../embeddings/embeddings.module';
import { PDFDocument } from './entities/pdf.entity';
import { TXTDocument } from './entities/txt.entity';
import { DOCXDocument } from './entities/docx.entity';

@Module({
  imports: [
    MikroOrmModule.forFeature([
      Document,
      DocumentVector,
      PDFDocument,
      TXTDocument,
      DOCXDocument,
    ]),
    RagModule,
    EmbeddingsModule,
  ],
  controllers: [DocumentController],
  providers: [DocumentProcessorService],
  exports: [DocumentProcessorService],
})
export class DocumentModule {}
