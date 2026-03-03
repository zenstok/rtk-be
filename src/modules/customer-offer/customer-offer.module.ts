import { Module } from '@nestjs/common';
import { CustomerOfferService } from './customer-offer.service';
import { CustomerOfferPdfService } from './customer-offer-pdf.service';
import { CustomerOfferController } from './customer-offer.controller';
import { CustomerOfferRepository } from './repositories/customer-offer.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerOffer } from './entities/customer-offer.entity';
import { StockEntry } from '../stock-entry/entities/stock-entry.entity';
import { StockExit } from '../stock-exit/entities/stock-exit.entity';
import { PriceAnalysisModule } from '../price-analysis/price-analysis.module';
import { FileModule } from '../file/file.module';
import { PriceAnalysis } from '../price-analysis/entities/price-analysis.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CustomerOffer, PriceAnalysis, StockEntry, StockExit]),
    PriceAnalysisModule,
    FileModule,
  ],
  controllers: [CustomerOfferController],
  providers: [CustomerOfferService, CustomerOfferPdfService, CustomerOfferRepository],
})
export class CustomerOfferModule {}
