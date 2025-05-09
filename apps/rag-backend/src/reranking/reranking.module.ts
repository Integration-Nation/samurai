import { Module } from '@nestjs/common';
import { RerankingService } from './reranking.service';

@Module({
  providers: [RerankingService],
  exports: [RerankingService],
})
export class RerankingModule {}
