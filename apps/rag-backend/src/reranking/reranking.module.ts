import { Module } from '@nestjs/common';
import { RerankingService } from './reranking.service';
import { DocumentModule } from '../documents/document.module';

@Module({
  imports: [DocumentModule],
  providers: [RerankingService],
  exports: [RerankingService],
})
export class RerankingModule {}
