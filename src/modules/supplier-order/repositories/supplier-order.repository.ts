import { DataSource, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { SupplierOrder } from '../entities/supplier-order.entity';

@Injectable()
export class SupplierOrderRepository extends Repository<SupplierOrder> {
  constructor(dataSource: DataSource) {
    super(SupplierOrder, dataSource.createEntityManager());
  }
}
