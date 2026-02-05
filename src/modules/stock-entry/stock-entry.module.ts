import { Module } from '@nestjs/common';
import { StockEntryService } from './stock-entry.service';
import { StockEntryController } from './stock-entry.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockEntry } from './entities/stock-entry.entity';
import { StockEntrySerialNumber } from './entities/stock-entry-serial-number.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StockEntry, StockEntrySerialNumber])],
  controllers: [StockEntryController],
  providers: [StockEntryService],
})
export class StockEntryModule {}
