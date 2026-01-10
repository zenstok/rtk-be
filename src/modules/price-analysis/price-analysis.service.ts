import { Injectable } from '@nestjs/common';
import { CreatePriceAnalysisDto } from './dto/create-price-analysis.dto';
import { UpdatePriceAnalysisDto } from './dto/update-price-analysis.dto';
import { PriceAnalysisRepository } from './repositories/price-analysis.repository';
import { BnrApiService } from '../bnr-api/bnr-api.service';

// POST create
// POST duplicate
// PATCH edit
// DELETE delete

// POST add supplier group
// PATCH supplier group
// DELETE supplier group

// POST add row
// PATCH row
// DELETE row

@Injectable()
export class PriceAnalysisService {
  constructor(
    private readonly priceAnalysisRepository: PriceAnalysisRepository,
    private readonly bnrApiService: BnrApiService,
  ) {}

  async create(dto: CreatePriceAnalysisDto) {
    const { eurToRonExchangeRate, usdToRonExchangeRate, gbpToRonExchangeRate } =
      await this.bnrApiService.getExchangeRatesForToday();

    return this.priceAnalysisRepository.insert({
      eurToRonExchangeRate,
      usdToRonExchangeRate,
      gbpToRonExchangeRate,
      productProcurementRequestId: dto.productProcurementRequestId,
    });
  }

  duplicate() {
    //duplicate all supplier groups and rows
  }

  findAll() {
    return `This action returns all priceAnalysis`;
  }

  findOne(id: number) {
    return `This action returns a #${id} priceAnalysis`;
  }

  update(id: number, updatePriceAnalysisDto: UpdatePriceAnalysisDto) {
    return `This action updates a #${id} priceAnalysis`;
  }

  remove(id: number) {
    return `This action removes a #${id} priceAnalysis`;
  }
}
