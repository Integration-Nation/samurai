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
        text: "You are a helpful assistant. Use the context below to answer the user's question.",
      },
      { type: 'text', text: cleanContextText },
    ];

    if (imageBase64) {
      systemContent.push({
        type: 'image_url',
        image_url: {
          url: imageBase64,
        },
      });
    }

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: prompt },
      ],
    });

    console.log(imageBase64);

    return response.choices[0].message.content ?? 'No response from OpenAI';
  }

  async query(prompt: string): Promise<string> {
    const similarDocs = await this.retrieveSimilarDocumentChunks(prompt);

    similarDocs.forEach((doc) => {
      console.log('Document Type:', doc.type);
    });
    const rerankedResults = await this.rerankingService.rerankResults(
      prompt,
      similarDocs,
      15
    );

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

  async retrieveSimilarDocumentChunks(
    query: string,
    limit = 15
  ): Promise<DocumentVector[]> {
    const queryEmbedding = await this.embeddingsService.generateTextEmbedding([
      query,
    ]);
    return this.vectorStoreService.findSimilar(queryEmbedding[0], limit);
  }
}
