import { Module } from '@nestjs/common';
import { RagService } from './rag.service';
import { RagController } from './rag.controller';
import { RerankingModule } from '../reranking/reranking.module';
import { EmbeddingsModule } from '../embeddings/embeddings.module';
import { VectorStoreModule } from '../vector-store/vector-store.module';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { User } from '../users/entities/user.entity';
import { DocumentModule } from '../documents/document.module';

@Module({
  imports: [
    RerankingModule,
    EmbeddingsModule,
    VectorStoreModule,
    DocumentModule,
    MikroOrmModule.forFeature([Conversation, Message, User]),
  ],
  controllers: [RagController],
  providers: [RagService],
  exports: [RagService],
})
export class RagModule {}
