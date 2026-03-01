import { DataSource, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { SuppliersProductCatalog } from '../entities/suppliers-product-catalog.entity';

@Injectable()
export class SupplierProductCatalogRepository extends Repository<SuppliersProductCatalog> {
  constructor(dataSource: DataSource) {
    super(SuppliersProductCatalog, dataSource.createEntityManager());
  }
}
