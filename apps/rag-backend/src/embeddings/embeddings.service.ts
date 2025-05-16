import { Injectable } from '@nestjs/common';
import { CohereClientV2 } from 'cohere-ai';
import OpenAI from 'openai';
import { Vector } from '../vector-store/entities/document-vector.entity';

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

  async generateTextEmbedding(textList: string[]): Promise<Vector[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: textList,
      encoding_format: 'float',
    });

    return response.data.map((d) => d.embedding);
  }

  async generateImageEmbeddings(base64Images: string[]): Promise<Vector> {
    const response = await this.cohereClient.embed({
      images: base64Images,
      model: 'embed-v4.0',
      inputType: 'image',
      embeddingTypes: ['float'],
      outputDimension: 1536,
    });

    return response.embeddings.float ? response.embeddings.float[0] : [];
  }
}
