import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { CohereClientV2 } from 'cohere-ai';
import { RerankingService } from '../reranking/reranking.service';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { VectorStoreService } from '../vector-store/vector-store.service';
import {
  DocumentVector,
  Vector,
} from '../vector-store/entities/document-chunk.entity';

export type CohereRerankChunk = {
  index: number;
  score: number;
  text: string;
};

@Injectable()
export class RagService {
  private openai: OpenAI;
  private readonly cohereClient: CohereClientV2;

  constructor(
    private readonly rerankingService: RerankingService,
    private readonly embeddingsService: EmbeddingsService,
    private readonly vectorStoreService: VectorStoreService
  ) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    this.cohereClient = new CohereClientV2({
      token: process.env.COHERE_API_KEY,
    });
  }

  async getEmbedding(text: string): Promise<Vector> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      encoding_format: 'float',
    });

    return response.data[0].embedding;
  }

  async generateResponse(
    prompt: string,
    relevantChunks: CohereRerankChunk[]
  ): Promise<string> {
    const cleanContextText = relevantChunks
      .map((doc) => doc.text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim())
      .join('\n\n');

    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'user', content: prompt },
        {
          role: 'system',
          content: `You are a helpful assistant. Use the following context to answer the user's question. 
                  If the context doesn't contain relevant information, acknowledge that and provide a 
                  general response based on your knowledge. Repsond in the same language as the user prompt.
                  
                  Context:
                  ${cleanContextText}`,
        },
      ],
    });
    return response.choices[0].message.content ?? 'No response from OpenAI';
  }
  async query(prompt: string): Promise<string> {
    const similarDocs = await this.retrieveSimilarDocumentChunks(prompt);
    const rerankedResults = await this.rerankingService.rerankResults(
      prompt,
      similarDocs,
      5
    );
    return this.generateResponse(prompt, rerankedResults);
  }

  async retrieveSimilarDocumentChunks(
    query: string,
    limit = 5
  ): Promise<DocumentVector[]> {
    const queryEmbedding = await this.embeddingsService.generateEmbedding(
      query
    );
    return this.vectorStoreService.findSimilar(queryEmbedding, limit);
  }
}
