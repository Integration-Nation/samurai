import { Injectable } from '@nestjs/common';
import { Document } from './entities/document.entity';
import { EntityRepository } from '@mikro-orm/postgresql';
import { InjectRepository } from '@mikro-orm/nestjs';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import pdfParse from 'pdf-parse';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

import { tmpdir } from 'os';
import { v4 as uuidv4 } from 'uuid';

import {
  DocumentVector,
  DocumentVectorType,
} from '../vector-store/entities/document-vector.entity';
import { EmbeddingsService } from '../embeddings/embeddings.service';

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
  images?: Uint8Array<ArrayBufferLike>[];
};

const execAsync = promisify(exec);

@Injectable()
export class DocumentProcessorService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: EntityRepository<Document>,
    @InjectRepository(DocumentVector)
    private readonly vectorRepository: EntityRepository<DocumentVector>,
    private readonly embeddingsService: EmbeddingsService
  ) {}

  async findAll(): Promise<Document[]> {
    return this.documentRepository.findAll();
  }

  async saveDocument(pdf: PDFData): Promise<Document> {
    const document = this.documentRepository.create(pdf);
    await this.documentRepository.getEntityManager().persistAndFlush(document);
    return document;
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
      images: await this.extractImagesViaPdfimages(file.buffer),
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
    const embeddings = await this.embeddingsService.generateTextEmbedding(
      chunks
    );

    for (let i = 0; i < chunks.length; i++) {
      const documentVector = new DocumentVector();
      documentVector.content = chunks[i];
      documentVector.embedding = embeddings[i];
      documentVector.document = document;
      documentVector.type = DocumentVectorType.TEXT;

      this.vectorRepository.getEntityManager().persist(documentVector);
    }
    if (pdfData.images && pdfData.images.length > 0) {
      const base64Images = pdfData.images.map(
        (img) => `data:image/png;base64,${Buffer.from(img).toString('base64')}`
      );
      for (let i = 0; i < base64Images.length; i++) {
        const base64Image = base64Images[i];
        const imageEmbedding =
          await this.embeddingsService.generateImageEmbeddings([base64Image]);

        if (imageEmbedding) {
          const documentVector = new DocumentVector();
          documentVector.content = base64Images[i];
          documentVector.embedding = imageEmbedding;
          documentVector.document = document;
          documentVector.type = DocumentVectorType.IMAGE;

          this.vectorRepository.getEntityManager().persist(documentVector);
        }
      }
    }
    //save images
    // if (pdfData.images) {
    //   for (const image of pdfData.images) {
    //     const embedding = await this.embeddingsService.generateEmbedding(
    //       image.toString('base64')
    //     );
    //     const documentVector = new DocumentVector();
    //     documentVector.content = image.toString('base64');
    //     documentVector.embedding = embedding;
    //     documentVector.document = document;
    //     documentVector.type = DocumentVector.DocumentVectorType.IMAGE;
    //     this.vectorRepository.getEntityManager().persist(documentVector);
    //   }
    // }

    await this.vectorRepository.getEntityManager().flush();
  }

  async extractImagesViaPdfimages(fileBuffer: Buffer): Promise<Buffer[]> {
    // Save PDF to temp file
    const tempPdfPath = path.join(tmpdir(), `${uuidv4()}.pdf`);
    fs.writeFileSync(tempPdfPath, fileBuffer);

    // Create temp output folder
    const outputDir = path.join(__dirname, '..', '..', 'temp-images');
    fs.mkdirSync(outputDir, { recursive: true });

    // Construct base output path (no extension)
    const outputBase = path.join(outputDir, 'image');

    // Run pdfimages
    await execAsync(`pdfimages -png "${tempPdfPath}" "${outputBase}"`);

    // Read generated image files
    const imageFiles = fs
      .readdirSync(outputDir)
      .filter((f) => f.endsWith('.png'))
      .sort();

    const images = imageFiles.map((f) =>
      fs.readFileSync(path.join(outputDir, f))
    );

    // Cleanup temp files
    fs.rmSync(tempPdfPath, { force: true });
    fs.rmSync(outputDir, { recursive: true, force: true });

    return images;
  }
}
