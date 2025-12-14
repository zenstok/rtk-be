import { Test, TestingModule } from '@nestjs/testing';
import { SuppliersProductCatalogService } from './suppliers-product-catalog.service';

describe('SuppliersProductCatalogService', () => {
  let service: SuppliersProductCatalogService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SuppliersProductCatalogService],
    }).compile();

    service = module.get<SuppliersProductCatalogService>(SuppliersProductCatalogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
