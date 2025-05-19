import { Injectable } from '@nestjs/common';

import { cosineDistance } from 'pgvector/mikro-orm';
import { EntityManager } from '@mikro-orm/postgresql';
import {
  DocumentVector,
  DocumentVectorType,
  Vector,
} from './entities/document-vector.entity';

@Injectable()
export class VectorStoreService {
  constructor(private readonly em: EntityManager) {}

  async findSimilar(
    queryEmbedding: Vector,
    limit = 15,
    typeFilter: DocumentVectorType.TEXT | DocumentVectorType.IMAGE | null = null
  ): Promise<DocumentVector[]> {
    const queryBuilder = this.em
      .createQueryBuilder(DocumentVector)
      .orderBy({
        [cosineDistance('embedding', queryEmbedding, this.em)]: 'ASC',
      })
      .limit(limit);

    // Add type filter if specified
    if (typeFilter) {
      queryBuilder.where({ type: typeFilter });
    }

    const documentChunks = await queryBuilder.getResult();

    return documentChunks;
  }
}
