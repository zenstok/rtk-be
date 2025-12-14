import { Injectable } from '@nestjs/common';
import { CreatePriceAnalysisDto } from './dto/create-price-analysis.dto';
import { UpdatePriceAnalysisDto } from './dto/update-price-analysis.dto';

@Injectable()
export class PriceAnalysisService {
  create(createPriceAnalysisDto: CreatePriceAnalysisDto) {
    return 'This action adds a new priceAnalysis';
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
