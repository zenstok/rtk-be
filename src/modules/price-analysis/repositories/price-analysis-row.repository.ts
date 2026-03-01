import { DataSource, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { PriceAnalysisRow } from '../entities/price-analysis-row.entity';

@Injectable()
export class PriceAnalysisRowRepository extends Repository<PriceAnalysisRow> {
  constructor(dataSource: DataSource) {
    super(PriceAnalysisRow, dataSource.createEntityManager());
  }
}
