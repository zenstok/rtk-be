import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CreatePriceAnalysisDto } from './dto/create-price-analysis.dto';
import { UpdatePriceAnalysisDto } from './dto/update-price-analysis.dto';
import { CreatePriceAnalysisSupplierGroupDto } from './dto/create-price-analysis-supplier-group.dto';
import { UpdatePriceAnalysisSupplierGroupDto } from './dto/update-price-analysis-supplier-group.dto';
import { CreatePriceAnalysisRowDto } from './dto/create-price-analysis-row.dto';
import { UpdatePriceAnalysisRowDto } from './dto/update-price-analysis-row.dto';
import { FindPriceAnalysisDto } from './dto/find-price-analysis.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { PriceAnalysisRowRepository } from './repositories/price-analysis-row.repository';
import { BnrApiService } from '../bnr-api/bnr-api.service';
import { PriceAnalysis } from './entities/price-analysis.entity';
import { PriceAnalysisSupplierGroup } from './entities/price-analysis-supplier-group.entity';
import { PriceAnalysisRow } from './entities/price-analysis-row.entity';
import {
  CustomerOffer,
  CustomerOfferStatus,
} from '../customer-offer/entities/customer-offer.entity';

@Injectable()
export class PriceAnalysisService {
  constructor(
    @InjectRepository(PriceAnalysis)
    private readonly priceAnalysisRepository: Repository<PriceAnalysis>,
    @InjectRepository(PriceAnalysisSupplierGroup)
    private readonly supplierGroupRepository: Repository<PriceAnalysisSupplierGroup>,
    private readonly rowRepository: PriceAnalysisRowRepository,
    private readonly bnrApiService: BnrApiService,
    private readonly dataSource: DataSource,
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
    const priceAnalysis = await this.priceAnalysisRepository.findOne({
      where: { id },
      relations: { priceAnalysisSupplierGroups: { priceAnalysisRows: true } },
    });

    if (!priceAnalysis) {
      throw new NotFoundException('Price analysis not found.');
    }

    return this.dataSource.transaction(async (manager) => {
      const priceAnalysisRepository = manager.getRepository(PriceAnalysis);
      const supplierGroupRepository = manager.getRepository(
        PriceAnalysisSupplierGroup,
      );
      const rowRepository = manager.getRepository(PriceAnalysisRow);

      const duplicatedPriceAnalysis = await priceAnalysisRepository.save(
        priceAnalysisRepository.create({
          projectDiscount: priceAnalysis.projectDiscount,
          vatRate: priceAnalysis.vatRate,
          eurToRonExchangeRate: priceAnalysis.eurToRonExchangeRate,
          usdToRonExchangeRate: priceAnalysis.usdToRonExchangeRate,
          gbpToRonExchangeRate: priceAnalysis.gbpToRonExchangeRate,
          productProcurementRequestId:
            priceAnalysis.productProcurementRequestId,
        }),
      );

      for (const group of priceAnalysis.priceAnalysisSupplierGroups ?? []) {
        const duplicatedGroup = await supplierGroupRepository.save(
          supplierGroupRepository.create({
            priceAnalysisId: duplicatedPriceAnalysis.id,
            supplierId: group.supplierId,
            transportationCost: group.transportationCost,
            importExportCost: group.importExportCost,
            financialCost: group.financialCost,
          }),
        );

        const rows = group.priceAnalysisRows ?? [];
        if (rows.length > 0) {
          await rowRepository.save(
            rows.map((row) =>
              rowRepository.create({
                priceAnalysisSupplierGroupId: duplicatedGroup.id,
                suppliersProductCatalogId: row.suppliersProductCatalogId,
                unitPrice: row.unitPrice,
                quantity: row.quantity,
                productDiscount: row.productDiscount,
                customerDiscount: row.customerDiscount,
                tariffRate: row.tariffRate,
              }),
            ),
          );
        }
      }

      return {
        message: 'Price analysis duplicated successfully.',
        duplicateId: duplicatedPriceAnalysis.id,
      };
    });
  }

  async findAll(dto: FindPriceAnalysisDto) {
    const qb = this.priceAnalysisRepository
      .createQueryBuilder('pa')
      .leftJoinAndSelect('pa.productProcurementRequest', 'ppr')
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
    if (!(await this.priceAnalysisRepository.existsBy({ id }))) {
      throw new NotFoundException('Price analysis not found.');
    }
    await this.assertNotLocked(id);
    await this.priceAnalysisRepository.update({ id }, dto);

    return { message: 'Price analysis updated successfully.' };
  }

  async delete(id: number) {
    if (!(await this.priceAnalysisRepository.existsBy({ id }))) {
      throw new NotFoundException('Price analysis not found.');
    }

    const offerCount = await this.dataSource
      .getRepository(CustomerOffer)
      .count({ where: { priceAnalysisId: id } });
    if (offerCount > 0) {
      throw new ConflictException(
        'Nu poți șterge analiza de preț deoarece are oferte asociate.',
      );
    }

    await this.dataSource.transaction(async (manager) => {
      const groups = await manager
        .getRepository(PriceAnalysisSupplierGroup)
        .find({ where: { priceAnalysisId: id }, select: ['id'] });

      const groupIds = groups.map((g) => g.id);
      if (groupIds.length > 0) {
        await manager
          .getRepository(PriceAnalysisRow)
          .delete({ priceAnalysisSupplierGroupId: In(groupIds) });
        await manager
          .getRepository(PriceAnalysisSupplierGroup)
          .delete({ priceAnalysisId: id });
      }

      await manager.getRepository(PriceAnalysis).delete({ id });
    });

    return { message: 'Price analysis deleted successfully.' };
  }

  // Supplier Group CRUD

  async createSupplierGroup(
    priceAnalysisId: number,
    dto: CreatePriceAnalysisSupplierGroupDto,
  ) {
    if (
      !(await this.priceAnalysisRepository.existsBy({ id: priceAnalysisId }))
    ) {
      throw new NotFoundException('Price analysis not found.');
    }
    await this.assertNotLocked(priceAnalysisId);
    return this.supplierGroupRepository.save({
      ...dto,
      priceAnalysisId,
    });
  }

  async updateSupplierGroup(
    groupId: number,
    dto: UpdatePriceAnalysisSupplierGroupDto,
  ) {
    const group = await this.supplierGroupRepository.findOne({
      where: { id: groupId },
      select: ['id', 'priceAnalysisId'],
    });
    if (!group) {
      throw new NotFoundException('Price analysis supplier group not found.');
    }
    await this.assertNotLocked(group.priceAnalysisId);
    await this.supplierGroupRepository.update({ id: groupId }, dto);
    return { message: 'Price analysis supplier group updated successfully.' };
  }

  async deleteSupplierGroup(groupId: number) {
    const group = await this.supplierGroupRepository.findOne({
      where: { id: groupId },
      select: ['id', 'priceAnalysisId'],
    });
    if (!group) {
      throw new NotFoundException('Price analysis supplier group not found.');
    }
    await this.assertNotLocked(group.priceAnalysisId);
    // Cascade: delete rows belonging to this group first
    await this.rowRepository.delete({ priceAnalysisSupplierGroupId: groupId });
    await this.supplierGroupRepository.delete({ id: groupId });
    return { message: 'Price analysis supplier group deleted successfully.' };
  }

  // Row CRUD

  async createRow(groupId: number, dto: CreatePriceAnalysisRowDto) {
    const group = await this.supplierGroupRepository.findOne({
      where: { id: groupId },
      select: ['id', 'priceAnalysisId'],
    });
    if (!group) {
      throw new NotFoundException('Price analysis supplier group not found.');
    }
    await this.assertNotLocked(group.priceAnalysisId);

    const existingRow = await this.rowRepository.findOneBy({
      priceAnalysisSupplierGroupId: groupId,
      suppliersProductCatalogId: dto.suppliersProductCatalogId,
    });
    if (existingRow) {
      throw new ConflictException(
        'Acest produs exista deja in acest grup de furnizor.',
      );
    }

    return this.rowRepository.save({
      ...dto,
      priceAnalysisSupplierGroupId: groupId,
    });
  }

  async updateRow(rowId: number, dto: UpdatePriceAnalysisRowDto) {
    const row = await this.rowRepository.findOne({
      where: { id: rowId },
      select: ['id', 'priceAnalysisSupplierGroupId'],
    });
    if (!row) {
      throw new NotFoundException('Price analysis row not found.');
    }
    const group = await this.supplierGroupRepository.findOne({
      where: { id: row.priceAnalysisSupplierGroupId },
      select: ['id', 'priceAnalysisId'],
    });
    await this.assertNotLocked(group!.priceAnalysisId);
    await this.rowRepository.update({ id: rowId }, dto);
    return { message: 'Price analysis row updated successfully.' };
  }

  async deleteRow(rowId: number) {
    const row = await this.rowRepository.findOne({
      where: { id: rowId },
      select: ['id', 'priceAnalysisSupplierGroupId'],
    });
    if (!row) {
      throw new NotFoundException('Price analysis row not found.');
    }
    const group = await this.supplierGroupRepository.findOne({
      where: { id: row.priceAnalysisSupplierGroupId },
      select: ['id', 'priceAnalysisId'],
    });
    await this.assertNotLocked(group!.priceAnalysisId);
    await this.rowRepository.delete({ id: rowId });
    return { message: 'Price analysis row deleted successfully.' };
  }

  private async assertNotLocked(priceAnalysisId: number): Promise<void> {
    const offer = await this.dataSource
      .getRepository(CustomerOffer)
      .findOne({
        where: { priceAnalysisId },
        select: ['id', 'status'],
      });

    if (
      offer &&
      offer.status !== CustomerOfferStatus.IN_PROGRESS &&
      offer.status !== CustomerOfferStatus.CANCELED
    ) {
      throw new ConflictException(
        'Analiza de preț nu poate fi modificată deoarece oferta asociată este finalizată.',
      );
    }
  }
}
