import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { ProductCategory } from './entities/product-category.entity';
import { SuppliersProductCatalogModule } from '../suppliers-product-catalog/suppliers-product-catalog.module';

@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductCategory]), SuppliersProductCatalogModule],
  controllers: [ProductController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}
