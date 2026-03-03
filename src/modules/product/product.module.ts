import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { ProductCategory } from './entities/product-category.entity';
import { ProductRepository } from './repositories/product.repository';
import { ProductCategoryRepository } from './repositories/product-category.repository';
import { SuppliersProductCatalogModule } from '../suppliers-product-catalog/suppliers-product-catalog.module';

@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductCategory]), SuppliersProductCatalogModule],
  controllers: [ProductController],
  providers: [ProductService, ProductRepository, ProductCategoryRepository],
  exports: [ProductService, ProductRepository],
})
export class ProductModule {}
