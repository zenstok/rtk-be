import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { PriceAnalysisSupplierGroup } from '../entities/price-analysis-supplier-group.entity';

@Injectable()
export class PriceAnalysisSupplierGroupRepository extends Repository<PriceAnalysisSupplierGroup> {
  constructor(dataSource: DataSource) {
    super(PriceAnalysisSupplierGroup, dataSource.createEntityManager());
  }
}
