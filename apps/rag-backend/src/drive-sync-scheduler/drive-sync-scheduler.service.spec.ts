import { Test, TestingModule } from '@nestjs/testing';
import { DriveSyncScheduler } from './drive-sync-scheduler.service';

describe('DriveSyncSchedulerService', () => {
  let service: DriveSyncScheduler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DriveSyncScheduler],
    }).compile();

    service = module.get<DriveSyncScheduler>(DriveSyncScheduler);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
