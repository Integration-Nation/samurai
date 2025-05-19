import { Injectable } from '@nestjs/common';
import { DocumentVector } from '../vector-store/entities/document-vector.entity';
import { CohereRerankChunk } from '../rag/rag.service';
import { CohereClientV2 } from 'cohere-ai';

@Injectable()
export class RerankingService {
  private readonly cohereClient: CohereClientV2;

  constructor() {
    this.cohereClient = new CohereClientV2({
      token: process.env.COHERE_API_KEY,
    });
  }

  async rerankResults(
    query: string,
    documentTextChunks: DocumentVector[],
    documentImageChunks: DocumentVector[],
    topN = 15
  ): Promise<CohereRerankChunk[]> {
    // Combine all document chunks into a single array with type info
    const allChunks: DocumentVector[] = [
      ...documentTextChunks.map((chunk) => ({ ...chunk })),
      ...documentImageChunks.map((chunk) => ({ ...chunk })),
    ];

    // Extract contents for reranking
    const docsForCohere = allChunks.map((chunk) => chunk.content);

    // Call Cohere rerank API
    const rerankedResults = await this.cohereClient.rerank({
      query,
      documents: docsForCohere,
      topN,
      model: 'rerank-v3.5',
    });

    // Map back to original chunks with type info
    const sortedChunks: CohereRerankChunk[] = rerankedResults.results.map(
      (result) => {
        const chunk = allChunks[result.index];
        return {
          text: chunk.content,
          score: result.relevanceScore,
          index: result.index,
          type: chunk.type,
        };
      }
    );

    return sortedChunks;
  }
}
