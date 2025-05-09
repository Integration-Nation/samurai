import { Injectable } from '@nestjs/common';
import { DocumentVector } from '../vector-store/entities/document-chunk.entity';
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
    documentChunks: DocumentVector[],
    topN = 5
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
      })
    );

    return sortedChunks;
  }
}
