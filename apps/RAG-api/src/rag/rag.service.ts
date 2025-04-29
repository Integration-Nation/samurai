import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import {
  DocumentChunk,
  Vector,
} from 'src/document/entities/document-chunk.entity';
import { CohereClientV2 } from 'cohere-ai';

type CohereRerankChunk = {
  index: number;
  score: number;
  text: string;
};

@Injectable()
export class RagService {
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

  async getEmbedding(text: string): Promise<Vector> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      encoding_format: 'float',
    });

    return response.data[0].embedding;
  }

  async rerankWithCohere(
    query: string,
    documentChunks: DocumentChunk[],
    topN = 5,
  ): Promise<CohereRerankChunk[]> {
    const docsForCohere = documentChunks.map((chunk) => chunk.content);

    const rerankedResults = await this.cohereClient.rerank({
      query,
      documents: docsForCohere,
      topN: topN,
      model: 'rerank-v3.5',
    });

    const sortedChunks: CohereRerankChunk[] = rerankedResults.results.map(
      (result) => ({
        text: documentChunks[result.index].content,
        score: result.relevanceScore,
        index: result.index,
      }),
    );

    return sortedChunks;
  }

  async generateAnswer(prompt: string): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'user', content: prompt },
        { role: 'system', content: 'You are a helpful assistant.' },
      ],
    });
    return response.choices[0].message.content ?? 'No response from OpenAI';
  }
}
