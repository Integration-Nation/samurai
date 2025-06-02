import { Body, Controller, Post, Res } from '@nestjs/common';
import { RagService } from './rag.service';
import type { Response } from 'express';

type Message = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  parts?: string[]; // valgfri – nogle biblioteker bruger `parts` til streaming eller strukturering
};

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

  @Post('stream')
  async stream(@Body() body: { messages: Message[] }, @Res() res: Response) {
    console.log('Received stream request with body:', body);

    // Set headers for Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    try {
      const lastUserMessage = [...body.messages]
        .reverse()
        .find((m) => m.role === 'user');
      const prompt = lastUserMessage?.content ?? 'No prompt provided';

      // Get streaming response from your RAG service
      const streamGenerator = this.ragService.queryStream(prompt);

      // Stream the response chunks
      for await (const chunk of streamGenerator) {
        const data = JSON.stringify({ content: chunk });
        res.write(`data: ${data}\n\n`);
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error) {
      console.error('Streaming error:', error);
      const errorData = JSON.stringify({
        error: 'An error occurred while processing your request',
      });
      res.write(`data: ${errorData}\n\n`);
      res.end();
    }
  }
}
