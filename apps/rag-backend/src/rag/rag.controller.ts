import { Body, Controller, Post } from '@nestjs/common';
import { RagService } from './rag.service';

@Controller('rag')
export class RagController {
  constructor(private readonly ragService: RagService) {}

  // Define your endpoints here
  // For example:
  // @Get('some-end

  @Post('query')
  async query(@Body() body: { prompt: string }) {
    const { prompt } = body;
    const results = await this.ragService.query(prompt);
    return results;
  }
}
