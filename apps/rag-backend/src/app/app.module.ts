import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from '../users/users.module';
import { DatabaseModule } from '../database/database.module';
import { DocumentModule } from '../documents/document.module';
import { RagService } from '../rag/rag.service';
import { RagModule } from '../rag/rag.module';
import { VectorStoreModule } from '../vector-store/vector-store.module';
import { RerankingModule } from '../reranking/reranking.module';
import { EmbeddingsModule } from '../embeddings/embeddings.module';

@Module({
  imports: [
    UsersModule,
    DatabaseModule,
    DocumentModule,
    RagModule,
    VectorStoreModule,
    RerankingModule,
    EmbeddingsModule,
  ],
  controllers: [AppController],
  providers: [AppService, RagService],
})
export class AppModule {}
