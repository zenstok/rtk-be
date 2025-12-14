import { Test, TestingModule } from '@nestjs/testing';
import { SupplierOrderService } from './supplier-order.service';

describe('SupplierOrderService', () => {
  let service: SupplierOrderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SupplierOrderService],
    }).compile();

    service = module.get<SupplierOrderService>(SupplierOrderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
