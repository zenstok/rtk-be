import { Test, TestingModule } from '@nestjs/testing';
import { StockExitService } from './stock-exit.service';

describe('StockExitService', () => {
  let service: StockExitService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StockExitService],
    }).compile();

    service = module.get<StockExitService>(StockExitService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
