import { Module } from '@nestjs/common';
import { DocumentController } from './document.controller';
import { DocumentProcessorService } from './document-processor.service';
import { Document } from './entities/document.entity';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { DocumentVector } from '../vector-store/entities/document-vector.entity';
import { RagModule } from '../rag/rag.module';
import { EmbeddingsModule } from '../embeddings/embeddings.module';

@Module({
  imports: [
    MikroOrmModule.forFeature([Document, DocumentVector]),
    RagModule,
    EmbeddingsModule,
  ],
  controllers: [DocumentController],
  providers: [DocumentProcessorService],
})
export class DocumentModule {}
