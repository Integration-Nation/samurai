import { Test, TestingModule } from '@nestjs/testing';
import { RerankingService } from './reranking.service';

describe('RerankingService', () => {
  let service: RerankingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RerankingService],
    }).compile();

    service = module.get<RerankingService>(RerankingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
