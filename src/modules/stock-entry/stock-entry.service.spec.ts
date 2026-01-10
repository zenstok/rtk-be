import { Test, TestingModule } from '@nestjs/testing';
import { StockEntryService } from './stock-entry.service';

describe('StockEntryService', () => {
  let service: StockEntryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StockEntryService],
    }).compile();

    service = module.get<StockEntryService>(StockEntryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
