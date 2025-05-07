import { Injectable } from '@nestjs/common';
import { Document } from './entities/document.entity';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { InjectRepository } from '@mikro-orm/nestjs';
import { CohereRerankChunk, RagService } from '../rag/rag.service';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import pdfParse from 'pdf-parse';
import { DocumentChunk, Vector } from './entities/document-chunk.entity';
import { cosineDistance } from 'pgvector/mikro-orm';

type PDFData = {
  text: string;
  numPages: number;
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
  creationDate?: string;
  modDate?: string;
};

@Injectable()
export class DocumentService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: EntityRepository<Document>,
    @InjectRepository(DocumentChunk)
    private readonly chunkRepository: EntityRepository<DocumentChunk>,
    private readonly em: EntityManager,
    private readonly ragService: RagService
  ) {}

  async findAll(): Promise<Document[]> {
    return this.documentRepository.findAll();
  }

  async saveDocument(pdf: PDFData): Promise<Document> {
    const document = this.documentRepository.create(pdf);
    await this.documentRepository.getEntityManager().persistAndFlush(document);
    return document;
  }

  async generateEmbedding(text: string): Promise<Vector> {
    const response: Vector = await this.ragService.getEmbedding(text);
    console.log('Embedding response:', response);
    return response;
  }

  async readPDF(file: Express.Multer.File): Promise<PDFData> {
    const pdfData = await pdfParse(file.buffer);

    const pdf: PDFData = {
      text: pdfData.text,
      numPages: pdfData.numpages,
      title: pdfData.info.Title,
      author: pdfData.info.Author,
      subject: pdfData.info.Subject,
      keywords: pdfData.info.Keywords,
      creator: pdfData.info.Creator,
      producer: pdfData.info.Producer,
      creationDate: pdfData.info.CreationDate,
      modDate: pdfData.info.ModDate,
    };

    console.log('PDF data:', pdf);
    return pdf;
  }

  async processPdf(file: Express.Multer.File): Promise<void> {
    const pdfData = await this.readPDF(file);
    const text = pdfData.text;

    const document = await this.saveDocument(pdfData);

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: ['\n\n', '\n', '. ', ' ', ''],
    });

    const chunks = await splitter.splitText(text);

    for (const chunk of chunks) {
      const embedding = await this.generateEmbedding(chunk);
      const documentChunk = new DocumentChunk();
      documentChunk.content = chunk;
      documentChunk.embedding = embedding;
      documentChunk.document = document;

      this.chunkRepository.getEntityManager().persist(documentChunk);
    }

    await this.chunkRepository.getEntityManager().flush();
  }

  async findSimilar(
    queryEmbedding: Vector,
    limit = 5
  ): Promise<DocumentChunk[]> {
    const documentChunks = await this.em
      .createQueryBuilder(DocumentChunk)
      .orderBy({
        [cosineDistance('embedding', queryEmbedding, this.em)]: 'ASC',
      })
      .limit(limit)
      .getResult();

    return documentChunks;
  }

  async retrieveSimilarDocumentChunks(
    query: string,
    limit = 5
  ): Promise<DocumentChunk[]> {
    const queryEmbedding = await this.generateEmbedding(query);
    return this.findSimilar(queryEmbedding, limit);
  }

  async rerankWithCohere(
    query: string,
    documentChunks: DocumentChunk[],
    topN = 5
  ) {
    return await this.ragService.rerankWithCohere(query, documentChunks, topN);
  }

  async generateResponse(
    query: string,
    documentChunks: CohereRerankChunk[]
  ): Promise<string> {
    return await this.ragService.generateResponse(query, documentChunks);
  }
}
