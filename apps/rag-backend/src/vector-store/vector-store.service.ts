import { Injectable } from '@nestjs/common';

import { cosineDistance } from 'pgvector/mikro-orm';
import { EntityManager } from '@mikro-orm/postgresql';
import { DocumentVector, Vector } from './entities/document-chunk.entity';

@Injectable()
export class VectorStoreService {
  constructor(private readonly em: EntityManager) {}

  async findSimilar(
    queryEmbedding: Vector,
    limit = 5
  ): Promise<DocumentVector[]> {
    const documentChunks = await this.em
      .createQueryBuilder(DocumentVector)
      .orderBy({
        [cosineDistance('embedding', queryEmbedding, this.em)]: 'ASC',
      })
      .limit(limit)
      .getResult();

    return documentChunks;
  }
}
