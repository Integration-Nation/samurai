import { Test, TestingModule } from '@nestjs/testing';
import { DriveSyncController } from './drive-sync-token.controller';

describe('DriveSyncTokenController', () => {
  let controller: DriveSyncController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DriveSyncController],
    }).compile();

    controller = module.get<DriveSyncController>(DriveSyncController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
