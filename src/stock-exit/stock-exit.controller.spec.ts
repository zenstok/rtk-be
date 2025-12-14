import { Test, TestingModule } from '@nestjs/testing';
import { StockExitController } from './stock-exit.controller';
import { StockExitService } from './stock-exit.service';

describe('StockExitController', () => {
  let controller: StockExitController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StockExitController],
      providers: [StockExitService],
    }).compile();

    controller = module.get<StockExitController>(StockExitController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
