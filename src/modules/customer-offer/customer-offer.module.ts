import { Module } from '@nestjs/common';
import { CustomerOfferService } from './customer-offer.service';
import { CustomerOfferController } from './customer-offer.controller';
import { CustomerOfferRepository } from './repositories/customer-offer.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerOffer } from './entities/customer-offer.entity';
import { StockEntry } from '../stock-entry/entities/stock-entry.entity';
import { StockExit } from '../stock-exit/entities/stock-exit.entity';
import { PriceAnalysisModule } from '../price-analysis/price-analysis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CustomerOffer, StockEntry, StockExit]),
    PriceAnalysisModule,
  ],
  controllers: [CustomerOfferController],
  providers: [CustomerOfferService, CustomerOfferRepository],
})
export class CustomerOfferModule {}
