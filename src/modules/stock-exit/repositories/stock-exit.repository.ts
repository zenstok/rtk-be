import { DataSource, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { StockExit } from '../entities/stock-exit.entity';

@Injectable()
export class StockExitRepository extends Repository<StockExit> {
  constructor(dataSource: DataSource) {
    super(StockExit, dataSource.createEntityManager());
  }
}
