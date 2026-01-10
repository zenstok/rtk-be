import { Test, TestingModule } from '@nestjs/testing';
import { PriceAnalysisService } from './price-analysis.service';

describe('PriceAnalysisService', () => {
  let service: PriceAnalysisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PriceAnalysisService],
    }).compile();

    service = module.get<PriceAnalysisService>(PriceAnalysisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
