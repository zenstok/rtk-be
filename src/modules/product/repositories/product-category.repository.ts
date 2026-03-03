import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ProductCategory } from '../entities/product-category.entity';

@Injectable()
export class ProductCategoryRepository extends Repository<ProductCategory> {
  constructor(dataSource: DataSource) {
    super(ProductCategory, dataSource.createEntityManager());
  }
}
