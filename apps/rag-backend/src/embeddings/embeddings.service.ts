import { Injectable } from '@nestjs/common';
import { CohereClientV2 } from 'cohere-ai';
import OpenAI from 'openai';
import { Vector } from '../vector-store/entities/document-chunk.entity';

@Injectable()
export class EmbeddingsService {
  private openai: OpenAI;
  private readonly cohereClient: CohereClientV2;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    this.cohereClient = new CohereClientV2({
      token: process.env.COHERE_API_KEY,
    });
  }

  async generateEmbedding(text: string): Promise<Vector> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      encoding_format: 'float',
    });

    return response.data[0].embedding;
  }
}
