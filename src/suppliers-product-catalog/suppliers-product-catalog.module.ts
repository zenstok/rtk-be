import { Module } from '@nestjs/common';
import { SuppliersProductCatalogService } from './suppliers-product-catalog.service';
import { SuppliersProductCatalogController } from './suppliers-product-catalog.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuppliersProductCatalog } from './entities/suppliers-product-catalog.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SuppliersProductCatalog])],
  controllers: [SuppliersProductCatalogController],
  providers: [SuppliersProductCatalogService],
})
export class SuppliersProductCatalogModule {}
