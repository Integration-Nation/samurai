import { Body, Controller, Post } from '@nestjs/common';
import { RagService } from './rag.service';

@Controller('rag')
export class RagController {
  constructor(private readonly ragService: RagService) {}

  @Post('query')
  async query(@Body() body: { prompt: string }) {
    const { prompt } = body;
    const answer = await this.ragService.query(prompt);
    return {
      messages: [
        {
          id: Date.now().toString(),
          role: 'assistant',
          parts: [{ type: 'text', text: answer }],
        },
      ],
    };
  }
}
