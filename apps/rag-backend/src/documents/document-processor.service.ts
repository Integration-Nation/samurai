import { Injectable } from '@nestjs/common';
import { Document } from './entities/document.entity';
import { EntityRepository } from '@mikro-orm/postgresql';
import { InjectRepository } from '@mikro-orm/nestjs';
import { RagService } from '../rag/rag.service';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import pdfParse from 'pdf-parse';
import {
  DocumentVector,
  Vector,
} from '../vector-store/entities/document-chunk.entity';

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
export class DocumentProcessorService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: EntityRepository<Document>,
    @InjectRepository(DocumentVector)
    private readonly vectorRepository: EntityRepository<DocumentVector>,
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
      const documentVector = new DocumentVector();
      documentVector.content = chunk;
      documentVector.embedding = embedding;
      documentVector.document = document;

      this.vectorRepository.getEntityManager().persist(documentVector);
    }

    await this.vectorRepository.getEntityManager().flush();
  }

  // async rerankWithCohere(
  //   query: string,
  //   documentChunks: DocumentChunk[],
  //   topN = 5
  // ) {
  //   return await this.ragService.rerankResults(query, documentChunks, topN);
  // }

  // async generateResponse(
  //   query: string,
  //   documentChunks: CohereRerankChunk[]
  // ): Promise<string> {
  //   return await this.ragService.generateResponse(query, documentChunks);
  // }
}
