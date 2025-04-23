import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { Repository } from 'typeorm/repository/Repository';
import { Document } from './entities/document.entity';

@Injectable()
export class DocumentService {
  private readonly documentRepository: Repository<Document>;

  constructor(
    @InjectEntityManager()
    private readonly manager: EntityManager,
    private readonly dataSource: DataSource,
  ) {
    this.documentRepository = this.manager.getRepository(Document);
  }

  async saveDocument(content: string, embedding: number[]) {
    const doc = this.documentRepository.create({ content, embedding });
    return this.documentRepository.save(doc);
  }

  async searchSimilarDocuments(
    embedding: number[],
    limit = 5,
  ): Promise<Document> {
    return this.dataSource.query(
      `SELECT *, embedding <=> $1 AS similarity
       FROM document
       ORDER BY similarity ASC
       LIMIT $2`,
      [embedding, limit],
    );
  }
}
