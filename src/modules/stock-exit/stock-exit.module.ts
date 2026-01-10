import { Module } from '@nestjs/common';
import { StockExitService } from './stock-exit.service';
import { StockExitController } from './stock-exit.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockExit } from './entities/stock-exit.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StockExit])],
  controllers: [StockExitController],
  providers: [StockExitService],
})
export class StockExitModule {}
