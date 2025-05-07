import { Module } from '@nestjs/common';
import { RagService } from './rag.service';

@Module({
  imports: [],
  controllers: [],
  providers: [RagService],
  exports: [RagService],
})
export class OpenAiModule {}
