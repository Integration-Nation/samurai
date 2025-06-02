import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  Delete,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { RagService } from './rag.service';
import type { Request as ExpressRequest, Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// Define proper interfaces
interface AuthenticatedUser {
  id: string;
  email?: string;
  // Add other user properties as needed
}

interface AuthenticatedRequest extends ExpressRequest {
  user: AuthenticatedUser;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  parts?: string[];
}

interface QueryBody {
  prompt: string;
}

interface StreamBody {
  messages: Message[];
  conversationId?: string;
}

interface UpdateTitleBody {
  title: string;
}

@Controller('rag')
@UseGuards(JwtAuthGuard)
export class RagController {
  constructor(private readonly ragService: RagService) {}

  @Post('query')
  async query(@Body() body: QueryBody, @Request() req: AuthenticatedRequest) {
    const { prompt } = body;
    const userId = req.user.id;

    const answer = await this.ragService.query(prompt);
    return {
      messages: [
        {
          id: Date.now().toString(),
          role: 'assistant' as const,
          parts: [{ type: 'text', text: answer }],
        },
      ],
    };
  }

  @Post('stream')
  async stream(
    @Body() body: StreamBody,
    @Res() res: Response,
    @Request() req: AuthenticatedRequest
  ) {
    const { messages, conversationId } = body;
    const userId = req.user.id;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      const lastUserMessage = [...messages]
        .reverse()
        .find((m) => m.role === 'user');
      const prompt = lastUserMessage?.content ?? 'No prompt provided';

      let currentConversationId = conversationId;

      // If no conversation ID, create a new conversation for this user
      if (!currentConversationId) {
        currentConversationId = await this.ragService.createNewConversation(
          userId
        );
      }

      // Save user message with user context
      if (prompt && currentConversationId) {
        await this.ragService.saveMessage(
          currentConversationId,
          'user',
          prompt,
          userId
        );
      }

      const stream = this.ragService.queryStream(prompt);

      let fullResponse = '';

      for await (const chunk of stream) {
        fullResponse += chunk;
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }

      // Save assistant message with user context
      const convId = await this.ragService.saveMessage(
        currentConversationId,
        'assistant',
        fullResponse,
        userId
      );

      res.write(
        `data: ${JSON.stringify({ done: true, conversationId: convId })}\n\n`
      );
      res.end();
    } catch (err) {
      console.error(err);
      res.write(`data: ${JSON.stringify({ error: 'Server error' })}\n\n`);
      res.end();
    }
  }

  @Get('conversations')
  async getConversations(@Request() req: AuthenticatedRequest) {
    const userId = req.user.id;
    return this.ragService.getAllConversations(userId);
  }

  @Get('messages')
  async getMessages(
    @Query('conversationId') conversationId: string,
    @Request() req: AuthenticatedRequest
  ) {
    const userId = req.user.id;
    return this.ragService.getMessagesForConversation(conversationId, userId);
  }

  @Delete('conversations/:id')
  async deleteConversation(
    @Param('id') conversationId: string,
    @Request() req: AuthenticatedRequest
  ) {
    const userId = req.user.id;
    await this.ragService.deleteConversation(conversationId, userId);
    return { success: true };
  }

  @Post('conversations/:id/title')
  async updateConversationTitle(
    @Param('id') conversationId: string,
    @Body() body: UpdateTitleBody,
    @Request() req: AuthenticatedRequest
  ) {
    const { title } = body;
    const userId = req.user.id;
    await this.ragService.updateConversationTitle(
      conversationId,
      title,
      userId
    );
    return { success: true };
  }
}
