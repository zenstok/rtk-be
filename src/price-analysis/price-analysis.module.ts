import { Module } from '@nestjs/common';
import { PriceAnalysisService } from './price-analysis.service';
import { PriceAnalysisController } from './price-analysis.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PriceAnalysis } from './entities/price-analysis.entity';
import { PriceAnalysisRow } from './entities/price-analysis-row.entity';
import { PriceAnalysisSupplierGroup } from './entities/price-analysis-supplier-group.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PriceAnalysis,
      PriceAnalysisSupplierGroup,
      PriceAnalysisRow,
    ]),
  ],
  controllers: [PriceAnalysisController],
  providers: [PriceAnalysisService],
})
export class PriceAnalysisModule {}
