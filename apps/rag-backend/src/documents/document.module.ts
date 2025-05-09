import { Module } from '@nestjs/common';
import { DocumentController } from './document.controller';
import { DocumentProcessorService } from './document-processor.service';
import { Document } from './entities/document.entity';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { DocumentVector } from '../vector-store/entities/document-chunk.entity';
import { RagModule } from '../rag/rag.module';

@Module({
  imports: [MikroOrmModule.forFeature([Document, DocumentVector]), RagModule],
  controllers: [DocumentController],
  providers: [DocumentProcessorService],
})
export class DocumentModule {}
