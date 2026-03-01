import { DataSource, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { StockEntryDelivery } from '../../stock-entry/entities/stock-entry-delivery.entity';

@Injectable()
export class StockEntryDeliveryRepository extends Repository<StockEntryDelivery> {
  constructor(dataSource: DataSource) {
    super(StockEntryDelivery, dataSource.createEntityManager());
  }
}
