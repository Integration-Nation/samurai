import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { RerankingService } from '../reranking/reranking.service';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { VectorStoreService } from '../vector-store/vector-store.service';
import {
  DocumentVector,
  DocumentVectorType,
} from '../vector-store/entities/document-vector.entity';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, t } from '@mikro-orm/postgresql';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { User } from '../users/entities/user.entity';

export type CohereRerankChunk = {
  index: number;
  score: number;
  text: string;
  type: DocumentVectorType;
  document: {
    uuid: string;
    fileName: string;
  };
};

export type SytemPromptContent = {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
  };
};

@Injectable()
export class RagService {
  private openai: OpenAI;

  constructor(
    private readonly rerankingService: RerankingService,
    private readonly embeddingsService: EmbeddingsService,
    private readonly vectorStoreService: VectorStoreService,
    @InjectRepository(Conversation)
    private conversationRepo: EntityRepository<Conversation>,
    @InjectRepository(Message)
    private messageRepo: EntityRepository<Message>,
    @InjectRepository(User)
    private userRepo: EntityRepository<User>
  ) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generateResponse(
    prompt: string,
    relevantChunks: CohereRerankChunk[],
    imageBase64?: string
  ): Promise<string> {
    const cleanContextText = relevantChunks
      .map((doc) => doc.text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim())
      .join('\n\n');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const systemContent: any[] = [
      {
        type: 'text',
        text: `You are a helpful assistant. Use the following context to answer the user's question. 
                  If the context doesn't contain relevant information, acknowledge that and provide a 
                  general response based on your knowledge. Repsond in the same language as the user prompt.

                  Context:
                  ${cleanContextText}`,
      },
    ];

    if (imageBase64) {
      systemContent.push({
        type: 'image_url',
        image_url: { url: imageBase64 },
      });
    }

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: prompt },
      ],
    });

    return response.choices[0].message.content ?? 'No response from OpenAI';
  }

  async *generateResponseStream(
    prompt: string,
    relevantChunks: CohereRerankChunk[],
    imageBase64?: string,
    filename?: string
  ): AsyncGenerator<string, void, unknown> {
    const cleanContextText = relevantChunks
      .map((doc) => doc.text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim())
      .join('\n\n');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const systemContent: any[] = [
      {
        type: 'text',
        text: `You are a helpful assistant. Use the following context to answer the user's question. 
                  If the context doesn't contain relevant information, acknowledge that and provide a 
                  general response based on your knowledge. Respond in the same language as the user prompt.
                  
                  ${
                    filename &&
                    'here is the filename of the top document used: ' +
                      filename +
                      ' end the response with this filename as a source in an italic font style, starting with "Source: ".'
                  }
                  
                  Context:
                  ${cleanContextText}`,
      },
    ];

    if (imageBase64) {
      systemContent.push({
        type: 'image_url',
        image_url: { url: imageBase64 },
      });
    }

    try {
      const stream = await this.openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          { role: 'system', content: systemContent },
          { role: 'user', content: prompt },
        ],
        stream: true, // Enable streaming
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      console.error('Error in generateResponseStream:', error);
      yield 'Sorry, an error occurred while generating the response.';
    }
  }

  async query(prompt: string): Promise<string> {
    const similarTexts = await this.similaritySeachText(prompt);
    const similarImages = await this.similaritySeachImages(prompt);

    similarTexts.forEach((doc) => {
      console.log('Document Type:', doc.type);
    });

    similarImages.forEach((doc) => {
      console.log('Document Type:', doc.type);
    });

    const rerankedResults = await this.rerankingService.rerankResults(
      prompt,
      similarTexts,
      similarImages,
      15
    );

    console.log('Reranked Results:', rerankedResults);

    const filteredTextResults = rerankedResults.filter(
      (result) => result.type === DocumentVectorType.TEXT
    );
    const filteredImageResults = rerankedResults.filter(
      (result) => result.type === DocumentVectorType.IMAGE
    );

    return this.generateResponse(
      prompt,
      filteredTextResults,
      filteredImageResults[0]?.text
    );
  }

  async *queryStream(prompt: string): AsyncGenerator<string, void, unknown> {
    try {
      const similarTexts = await this.similaritySeachText(prompt);
      const similarImages = await this.similaritySeachImages(prompt);

      similarTexts.forEach(async (doc) => {
        console.log('Document Type:', doc.type);
      });

      similarImages.forEach((doc) => {
        console.log('Document Type:', doc.type);
        console.log('Original document:', doc.document);
      });

      const rerankedResults = await this.rerankingService.rerankResults(
        prompt,
        similarTexts,
        similarImages,
        15
      );

      // console.log('Reranked Results:', rerankedResults);

      const filteredTextResults = rerankedResults.filter(
        (result) => result.type === DocumentVectorType.TEXT
      );
      const filteredImageResults = rerankedResults.filter(
        (result) => result.type === DocumentVectorType.IMAGE
      );

      const topSourceName = rerankedResults[0]?.document.fileName;

      // Use the streaming generateResponse method
      for await (const chunk of this.generateResponseStream(
        prompt,
        filteredTextResults,
        filteredImageResults[0]?.text,
        topSourceName
      )) {
        yield chunk;
      }
    } catch (error) {
      console.error('Error in queryStream:', error);
      yield 'Sorry, an error occurred while processing your request.';
    }
  }

  async similaritySeachText(
    query: string,
    limit = 10
  ): Promise<DocumentVector[]> {
    const queryEmbedding = await this.embeddingsService.generateTextEmbeddings([
      query,
    ]);
    return this.vectorStoreService.findSimilar(
      queryEmbedding[0],
      limit,
      DocumentVectorType.TEXT
    );
  }

  async similaritySeachImages(
    query: string,
    limit = 5
  ): Promise<DocumentVector[]> {
    const queryEmbedding = await this.embeddingsService.generateQueryEmbedding(
      query
    );
    return this.vectorStoreService.findSimilar(
      queryEmbedding,
      limit,
      DocumentVectorType.IMAGE
    );
  }

  // Updated methods with user context
  async getAllConversations(userId: string) {
    return this.conversationRepo.find(
      { user: userId },
      {
        populate: ['messages'],
        orderBy: { createdAt: 'desc' },
      }
    );
  }

  async getMessagesForConversation(conversationId: string, userId: string) {
    // First verify the conversation belongs to the user
    const conversation = await this.conversationRepo.findOne({
      id: conversationId,
      user: userId,
    });

    if (!conversation) {
      throw new Error('Conversation not found or access denied');
    }

    const messages = await this.messageRepo.find(
      {
        conversation: conversationId,
        user: userId,
      },
      { orderBy: { createdAt: 'asc' } }
    );
    return messages;
  }

  async createNewConversation(userId: string): Promise<string> {
    const user = await this.userRepo.findOne(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const conversation = new Conversation();
    conversation.user = user;

    await this.conversationRepo
      .getEntityManager()
      .persistAndFlush(conversation);
    return conversation.id;
  }

  async deleteConversation(
    conversationId: string,
    userId: string
  ): Promise<void> {
    const conversation = await this.conversationRepo.findOne(
      {
        id: conversationId,
        user: userId,
      },
      { populate: ['messages'] }
    );

    if (!conversation) {
      throw new Error('Conversation not found or access denied');
    }

    // Delete all messages first
    if (conversation.messages && conversation.messages.length > 0) {
      await this.messageRepo
        .getEntityManager()
        .removeAndFlush(conversation.messages);
    }

    // Then delete the conversation
    await this.conversationRepo.getEntityManager().removeAndFlush(conversation);
  }

  async updateConversationTitle(
    conversationId: string,
    title: string,
    userId: string
  ): Promise<void> {
    const conversation = await this.conversationRepo.findOne({
      id: conversationId,
      user: userId,
    });

    if (!conversation) {
      throw new Error('Conversation not found or access denied');
    }

    conversation.title = title;
    await this.conversationRepo
      .getEntityManager()
      .persistAndFlush(conversation);
  }

  // Enhanced saveMessage method with user context
  async saveMessage(
    conversationId: string | undefined,
    role: Message['role'],
    content: string,
    userId: string
  ): Promise<string> {
    const user = await this.userRepo.findOne(userId);
    if (!user) {
      throw new Error('User not found');
    }

    let conversation: Conversation;

    if (conversationId) {
      const existingConversation = await this.conversationRepo.findOne({
        id: conversationId,
        user: userId,
      });

      if (existingConversation) {
        conversation = existingConversation;
      } else {
        // If conversation doesn't exist or doesn't belong to user, create a new one
        conversation = new Conversation();
        conversation.user = user;
        await this.conversationRepo
          .getEntityManager()
          .persistAndFlush(conversation);
      }
    } else {
      // Create new conversation
      conversation = new Conversation();
      conversation.user = user;
      await this.conversationRepo
        .getEntityManager()
        .persistAndFlush(conversation);
    }

    // Create and save the message
    const message = new Message();
    message.role = role;
    message.content = content;
    message.conversation = conversation;
    message.user = user;

    await this.messageRepo.getEntityManager().persistAndFlush(message);

    // Auto-generate title for conversation if it's the first user message and no title exists
    if (role === 'user' && !conversation.title) {
      const messageCount = await this.messageRepo.count({
        conversation: conversation.id,
        user: userId,
      });

      if (messageCount === 1) {
        // Generate title from first 50 characters of the first message
        const title =
          content.length > 50 ? content.substring(0, 50) + '...' : content;
        conversation.title = title;
        await this.conversationRepo
          .getEntityManager()
          .persistAndFlush(conversation);
      }
    }

    return conversation.id;
  }
}
