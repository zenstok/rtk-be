import { Module } from '@nestjs/common';
import { SuppliersProductCatalogService } from './suppliers-product-catalog.service';
import { SuppliersProductCatalogController } from './suppliers-product-catalog.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuppliersProductCatalog } from './entities/suppliers-product-catalog.entity';
import { SupplierProductCatalogRepository } from './repositories/supplier-product-catalog.repository';

@Module({
  imports: [TypeOrmModule.forFeature([SuppliersProductCatalog])],
  controllers: [SuppliersProductCatalogController],
  providers: [SuppliersProductCatalogService, SupplierProductCatalogRepository],
  exports: [SuppliersProductCatalogService, SupplierProductCatalogRepository],
})
export class SuppliersProductCatalogModule {}
