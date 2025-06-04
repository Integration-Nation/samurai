import { Test, TestingModule } from '@nestjs/testing';
import { DriveSyncTokenService } from './drive-sync-token.service';

describe('DriveSyncTokenService', () => {
  let service: DriveSyncTokenService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DriveSyncTokenService],
    }).compile();

    service = module.get<DriveSyncTokenService>(DriveSyncTokenService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
