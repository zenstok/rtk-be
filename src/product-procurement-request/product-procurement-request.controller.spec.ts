import { Test, TestingModule } from '@nestjs/testing';
import { ProductProcurementRequestController } from './product-procurement-request.controller';
import { ProductProcurementRequestService } from './product-procurement-request.service';

describe('ProductProcurementRequestController', () => {
  let controller: ProductProcurementRequestController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductProcurementRequestController],
      providers: [ProductProcurementRequestService],
    }).compile();

    controller = module.get<ProductProcurementRequestController>(ProductProcurementRequestController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
