import { Test, TestingModule } from '@nestjs/testing';
import { SupplierOrderController } from './supplier-order.controller';
import { SupplierOrderService } from './supplier-order.service';

describe('SupplierOrderController', () => {
  let controller: SupplierOrderController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SupplierOrderController],
      providers: [SupplierOrderService],
    }).compile();

    controller = module.get<SupplierOrderController>(SupplierOrderController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
