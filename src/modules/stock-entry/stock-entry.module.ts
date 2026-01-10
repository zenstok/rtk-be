import { Module } from '@nestjs/common';
import { StockEntryService } from './stock-entry.service';
import { StockEntryController } from './stock-entry.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockEntry } from './entities/stock-entry.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StockEntry])],
  controllers: [StockEntryController],
  providers: [StockEntryService],
})
export class StockEntryModule {}
