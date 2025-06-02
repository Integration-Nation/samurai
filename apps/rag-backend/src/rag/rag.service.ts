import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { RerankingService } from '../reranking/reranking.service';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { VectorStoreService } from '../vector-store/vector-store.service';
import {
  DocumentVector,
  DocumentVectorType,
} from '../vector-store/entities/document-vector.entity';

export type CohereRerankChunk = {
  index: number;
  score: number;
  text: string;
  type: DocumentVectorType;
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
    private readonly vectorStoreService: VectorStoreService
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
    imageBase64?: string
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

      // Use the streaming generateResponse method
      for await (const chunk of this.generateResponseStream(
        prompt,
        filteredTextResults,
        filteredImageResults[0]?.text
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
}
