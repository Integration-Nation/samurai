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
import mammoth from 'mammoth';
import {
  DocumentVector,
  DocumentVectorType,
} from '../vector-store/entities/document-vector.entity';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { PDFDocument } from './entities/pdf.entity';
import { TXTDocument } from './entities/txt.entity';
import { DOCXDocument } from './entities/docx.entity';

type PDFData = {
  fileName: string;
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

type TXTData = {
  fileName: string;
  lineCount: number;
  text: string;
};

type DOCXData = {
  fileName: string;
  wordCount: number;
  text: string;
  images?: string[];
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

  async savePdfDocument(pdf: PDFData): Promise<PDFDocument> {
    const pdfDocument = new PDFDocument(); // 👈 explicitly create subclass instance
    Object.assign(pdfDocument, pdf); // ✅ assign data

    await this.documentRepository
      .getEntityManager()
      .persistAndFlush(pdfDocument);
    return pdfDocument;
  }

  async saveTxtDocument(txt: TXTData): Promise<TXTDocument> {
    const txtDocument = new TXTDocument();
    Object.assign(txtDocument, txt);

    await this.documentRepository
      .getEntityManager()
      .persistAndFlush(txtDocument);
    return txtDocument;
  }

  async saveDocxDocument(docx: DOCXData): Promise<DOCXDocument> {
    const docxDocument = new DOCXDocument();
    Object.assign(docxDocument, docx);

    await this.documentRepository
      .getEntityManager()
      .persistAndFlush(docxDocument);
    return docxDocument;
  }

  async readPDF(file: Express.Multer.File): Promise<PDFData> {
    const pdfData = await pdfParse(file.buffer);

    const pdf: PDFData = {
      text: pdfData.text,
      numPages: pdfData.numpages,
      fileName: file.originalname,
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

  async readTXT(file: Express.Multer.File): Promise<TXTData> {
    const content = file.buffer.toString('utf-8');

    const lines = content.split('\n').map((line) => line.trim());

    const txt: TXTData = {
      fileName: file.originalname,
      lineCount: lines.length,
      text: content,
    };

    return txt;
  }

  async readDOCX(file: Express.Multer.File): Promise<DOCXData> {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    const text = result.value;

    const docx: DOCXData = {
      fileName: file.originalname,
      wordCount: text.split(/\s+/).length,
      text: text,
      images: await this.extractDocxImages(file.buffer),
    };

    return docx;
  }

  async processPdf(file: Express.Multer.File): Promise<void> {
    const pdfData = await this.readPDF(file);

    const document = await this.savePdfDocument(pdfData);

    if (pdfData.text && pdfData.text.length > 100) {
      const text = pdfData.text;

      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
        separators: ['\n\n', '\n', '. ', ' ', ''],
      });

      const chunks = await splitter.splitText(text);
      const embeddings = await this.embeddingsService.generateTextEmbeddings(
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

    await this.vectorRepository.getEntityManager().flush();
  }

  async processTxt(file: Express.Multer.File): Promise<void> {
    const txtData = await this.readTXT(file);
    const document = await this.saveTxtDocument(txtData);
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: ['\n\n', '\n', '. ', ' ', ''],
    });

    const chunks = await splitter.splitText(txtData.text);
    const embeddings = await this.embeddingsService.generateTextEmbeddings(
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
    await this.vectorRepository.getEntityManager().flush();
  }

  async processDOCX(file: Express.Multer.File): Promise<void> {
    const docxData = await this.readDOCX(file);

    const document = await this.saveDocxDocument(docxData);

    //ændr til smartere error handling for dokumenter som f.eks kun indeholder \n
    if (docxData.text && docxData.text.length > 100) {
      const text = docxData.text;

      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
        separators: ['\n\n', '\n', '. ', ' ', ''],
      });

      const chunks = await splitter.splitText(text);
      const embeddings = await this.embeddingsService.generateTextEmbeddings(
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
    }

    if (docxData.images && docxData.images.length > 0) {
      const base64Images = docxData.images;

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

  async extractDocxImages(fileBuffer: Buffer): Promise<string[]> {
    const imagesBase64: string[] = [];

    await mammoth.convertToHtml(
      { buffer: fileBuffer },
      {
        convertImage: mammoth.images.imgElement(function (image) {
          return image.read('base64').then((imageBuffer) => {
            const base64Src = `data:${image.contentType};base64,${imageBuffer}`;
            imagesBase64.push(base64Src);
            return { src: base64Src };
          });
        }),
      }
    );

    console.log('Docx images:', imagesBase64);

    return imagesBase64;
  }
}
