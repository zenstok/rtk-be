import { DataSource, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { PriceAnalysis } from '../entities/price-analysis.entity';

@Injectable()
export class PriceAnalysisRepository extends Repository<PriceAnalysis> {
  constructor(dataSource: DataSource) {
    super(PriceAnalysis, dataSource.createEntityManager());
  }
}
