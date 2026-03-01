import { Module } from '@nestjs/common';
import { StockExitService } from './stock-exit.service';
import { StockExitController } from './stock-exit.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockExit } from './entities/stock-exit.entity';
import { StockExitRepository } from './repositories/stock-exit.repository';

@Module({
  imports: [TypeOrmModule.forFeature([StockExit])],
  controllers: [StockExitController],
  providers: [StockExitService, StockExitRepository],
})
export class StockExitModule {}
