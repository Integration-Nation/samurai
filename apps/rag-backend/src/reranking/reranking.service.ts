import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { DocumentVector } from '../vector-store/entities/document-vector.entity';
import { CohereRerankChunk } from '../rag/rag.service';
import { CohereClientV2 } from 'cohere-ai';
import { DocumentProcessorService } from '../documents/document-processor.service';

@Injectable()
export class RerankingService {
  private readonly cohereClient: CohereClientV2;

  constructor(
    private readonly documentProcessorService: DocumentProcessorService
  ) {
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

    // const documentId = doc.document?.uuid;

    // if (documentId) {
    //   const document = await this.documentProcessorService.findById(documentId);
    //   console.log('Original document:', document?.fileName);
    // }

    // Map back to original chunks with type info
    const sortedChunks: CohereRerankChunk[] = await Promise.all(
      rerankedResults.results.map(async (result) => {
        const chunk = allChunks[result.index];

        const document = await this.documentProcessorService.findById(
          chunk.document.uuid
        );
        if (!document) {
          throw new InternalServerErrorException(
            `Document with UUID ${chunk.document.uuid} not found`
          );
        }

        return {
          text: chunk.content,
          score: result.relevanceScore,
          index: result.index,
          type: chunk.type,
          document: {
            uuid: chunk.document.uuid,
            fileName: document?.fileName,
          },
        };
      })
    );

    return sortedChunks;
  }
}
