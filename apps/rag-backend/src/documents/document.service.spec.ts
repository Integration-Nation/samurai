import { Test, TestingModule } from '@nestjs/testing';
import { DocumentProcessorService } from './document-processor.service';

describe('DocumentService', () => {
  let service: DocumentProcessorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DocumentProcessorService],
    }).compile();

    service = module.get<DocumentProcessorService>(DocumentProcessorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
