import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePriceAnalysisDto } from './dto/create-price-analysis.dto';
import { UpdatePriceAnalysisDto } from './dto/update-price-analysis.dto';
import { CreatePriceAnalysisSupplierGroupDto } from './dto/create-price-analysis-supplier-group.dto';
import { UpdatePriceAnalysisSupplierGroupDto } from './dto/update-price-analysis-supplier-group.dto';
import { CreatePriceAnalysisRowDto } from './dto/create-price-analysis-row.dto';
import { UpdatePriceAnalysisRowDto } from './dto/update-price-analysis-row.dto';
import { FindPriceAnalysisDto } from './dto/find-price-analysis.dto';
import { PriceAnalysisRepository } from './repositories/price-analysis.repository';
import { PriceAnalysisSupplierGroupRepository } from './repositories/price-analysis-supplier-group.repository';
import { PriceAnalysisRowRepository } from './repositories/price-analysis-row.repository';
import { BnrApiService } from '../bnr-api/bnr-api.service';
import { PriceAnalysis } from './entities/price-analysis.entity';
import { DeepPartial } from 'typeorm';

@Injectable()
export class PriceAnalysisService {
  constructor(
    private readonly priceAnalysisRepository: PriceAnalysisRepository,
    private readonly supplierGroupRepository: PriceAnalysisSupplierGroupRepository,
    private readonly rowRepository: PriceAnalysisRowRepository,
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

  async findAll(dto: FindPriceAnalysisDto) {
    const qb = this.priceAnalysisRepository
      .createQueryBuilder('pa')
      .leftJoinAndSelect(
        'pa.productProcurementRequest',
        'ppr',
      )
      .orderBy('pa.createdAt', 'DESC')
      .skip(dto.offset)
      .take(dto.limit > 0 ? dto.limit : undefined);

    if (dto.productProcurementRequestId) {
      qb.andWhere('pa.productProcurementRequestId = :pprId', {
        pprId: dto.productProcurementRequestId,
      });
    }

    if (dto.search) {
      qb.andWhere('ppr.projectName ILIKE :search', {
        search: `%${dto.search}%`,
      });
    }

    const [results, total] = await qb.getManyAndCount();
    return { results, total };
  }

  async findOne(id: number) {
    const pa = await this.priceAnalysisRepository.findOne({
      where: { id },
      relations: {
        priceAnalysisSupplierGroups: {
          supplier: true,
          priceAnalysisRows: { suppliersProductCatalog: { product: true } },
        },
      },
    });
    if (!pa) {
      throw new NotFoundException('Price analysis not found.');
    }
    return pa;
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

  // Supplier Group CRUD

  async createSupplierGroup(
    priceAnalysisId: number,
    dto: CreatePriceAnalysisSupplierGroupDto,
  ) {
    if (!(await this.priceAnalysisRepository.existsBy({ id: priceAnalysisId }))) {
      throw new NotFoundException('Price analysis not found.');
    }
    return this.supplierGroupRepository.save({
      ...dto,
      priceAnalysisId,
    });
  }

  async updateSupplierGroup(
    groupId: number,
    dto: UpdatePriceAnalysisSupplierGroupDto,
  ) {
    if (!(await this.supplierGroupRepository.existsBy({ id: groupId }))) {
      throw new NotFoundException('Price analysis supplier group not found.');
    }
    await this.supplierGroupRepository.update({ id: groupId }, dto);
    return { message: 'Price analysis supplier group updated successfully.' };
  }

  async deleteSupplierGroup(groupId: number) {
    if (!(await this.supplierGroupRepository.existsBy({ id: groupId }))) {
      throw new NotFoundException('Price analysis supplier group not found.');
    }
    // Cascade: delete rows belonging to this group first
    await this.rowRepository.delete({ priceAnalysisSupplierGroupId: groupId });
    await this.supplierGroupRepository.delete({ id: groupId });
    return { message: 'Price analysis supplier group deleted successfully.' };
  }

  // Row CRUD

  async createRow(groupId: number, dto: CreatePriceAnalysisRowDto) {
    if (!(await this.supplierGroupRepository.existsBy({ id: groupId }))) {
      throw new NotFoundException('Price analysis supplier group not found.');
    }
    return this.rowRepository.save({
      ...dto,
      priceAnalysisSupplierGroupId: groupId,
    });
  }

  async updateRow(rowId: number, dto: UpdatePriceAnalysisRowDto) {
    if (!(await this.rowRepository.existsBy({ id: rowId }))) {
      throw new NotFoundException('Price analysis row not found.');
    }
    await this.rowRepository.update({ id: rowId }, dto);
    return { message: 'Price analysis row updated successfully.' };
  }

  async deleteRow(rowId: number) {
    if (!(await this.rowRepository.existsBy({ id: rowId }))) {
      throw new NotFoundException('Price analysis row not found.');
    }
    await this.rowRepository.delete({ id: rowId });
    return { message: 'Price analysis row deleted successfully.' };
  }
}
