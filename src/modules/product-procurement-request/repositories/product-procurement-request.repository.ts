import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ProductProcurementRequest } from '../entities/product-procurement-request.entity';

@Injectable()
export class ProductProcurementRequestRepository extends Repository<ProductProcurementRequest> {
  constructor(dataSource: DataSource) {
    super(ProductProcurementRequest, dataSource.createEntityManager());
  }
}
