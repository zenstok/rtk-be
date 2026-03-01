import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePriceAnalysisDto } from './dto/create-price-analysis.dto';
import { UpdatePriceAnalysisDto } from './dto/update-price-analysis.dto';
import { PriceAnalysisRepository } from './repositories/price-analysis.repository';
import { BnrApiService } from '../bnr-api/bnr-api.service';
import { PriceAnalysis } from './entities/price-analysis.entity';
import { DeepPartial } from 'typeorm';
import { FindDto } from '../../utils/dtos/find.dto';

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

  async duplicate(id: number) {
    const priceAnalysis = (await this.priceAnalysisRepository.findOne({
      where: { id },
      relations: { priceAnalysisSupplierGroups: { priceAnalysisRows: true } },
    })) as DeepPartial<PriceAnalysis> | null;
    if (!priceAnalysis) {
      throw new NotFoundException('Price analysis not found.');
    }

    delete priceAnalysis.id;
    priceAnalysis.priceAnalysisSupplierGroups?.forEach((group) => {
      delete group.id;
      group.priceAnalysisRows?.forEach((row) => delete row.id);
    });

    const entity = await this.priceAnalysisRepository.save(priceAnalysis);

    return {
      message: 'Price analysis duplicated successfully.',
      duplicateId: entity.id,
    };
  }

  async findAll(dto: FindDto) {
    const [results, total] = await this.priceAnalysisRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip: dto.offset,
      take: dto.limit > 0 ? dto.limit : undefined,
    });

    return { results, total };
  }

  async findOne(id: number) {
    if (!(await this.priceAnalysisRepository.existsBy({ id }))) {
      throw new NotFoundException('Price analysis not found.');
    }

    return this.priceAnalysisRepository.findOne({
      relations: {
        priceAnalysisSupplierGroups: {
          supplier: true,
          priceAnalysisRows: { suppliersProductCatalog: { product: true } },
        },
      },
    });
  }

  async update(id: number, dto: UpdatePriceAnalysisDto) {
    //TODO if associated offer is finalized, price analysis cannot be updated anymore
    if (!(await this.priceAnalysisRepository.existsBy({ id }))) {
      throw new NotFoundException('Price analysis not found.');
    }
    await this.priceAnalysisRepository.update({ id }, dto);

    return { message: 'Price analysis updated successfully.' };
  }

  async delete(id: number) {
    if (!(await this.priceAnalysisRepository.existsBy({ id }))) {
      throw new NotFoundException('Price analysis not found.');
    }
    await this.priceAnalysisRepository.delete({ id });

    return { message: 'Price analysis deleted successfully.' };
  }

  createSupplierGroup(priceAnalysisId: number, dto: unknown) {}

  updateSupplierGroup(groupId: number, dto: unknown) {}

  deleteSupplierGroup(groupId: number) {}

  createRow(groupId: number, dto: unknown) {}

  updateRow(groupId: number, dto: unknown) {}

  deleteRow(groupId: number, dto: unknown) {}
}
