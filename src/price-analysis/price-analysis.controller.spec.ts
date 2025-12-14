import { Test, TestingModule } from '@nestjs/testing';
import { PriceAnalysisController } from './price-analysis.controller';
import { PriceAnalysisService } from './price-analysis.service';

describe('PriceAnalysisController', () => {
  let controller: PriceAnalysisController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PriceAnalysisController],
      providers: [PriceAnalysisService],
    }).compile();

    controller = module.get<PriceAnalysisController>(PriceAnalysisController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
