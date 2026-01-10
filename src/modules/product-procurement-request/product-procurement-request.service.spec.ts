import { Test, TestingModule } from '@nestjs/testing';
import { ProductProcurementRequestService } from './product-procurement-request.service';

describe('ProductProcurementRequestService', () => {
  let service: ProductProcurementRequestService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductProcurementRequestService],
    }).compile();

    service = module.get<ProductProcurementRequestService>(ProductProcurementRequestService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
