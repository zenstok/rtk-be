import { Test, TestingModule } from '@nestjs/testing';
import { SuppliersProductCatalogController } from './suppliers-product-catalog.controller';
import { SuppliersProductCatalogService } from './suppliers-product-catalog.service';

describe('SuppliersProductCatalogController', () => {
  let controller: SuppliersProductCatalogController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SuppliersProductCatalogController],
      providers: [SuppliersProductCatalogService],
    }).compile();

    controller = module.get<SuppliersProductCatalogController>(SuppliersProductCatalogController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
