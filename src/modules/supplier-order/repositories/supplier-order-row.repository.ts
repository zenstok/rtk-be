import { DataSource, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { SupplierOrderRow } from '../entities/supplier-order-row.entity';

@Injectable()
export class SupplierOrderRowRepository extends Repository<SupplierOrderRow> {
  constructor(dataSource: DataSource) {
    super(SupplierOrderRow, dataSource.createEntityManager());
  }
}
