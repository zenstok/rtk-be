import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CreateStockExitDto } from './dto/create-stock-exit.dto';
import { UpdateStockExitDto } from './dto/update-stock-exit.dto';
import { FindDto } from '../../utils/dtos/find.dto';
import { StockExit, StockExitSource } from './entities/stock-exit.entity';
import {
  StockEntry,
  StockEntryOrigin,
} from '../stock-entry/entities/stock-entry.entity';
import { Customer } from '../customer/entities/customer.entity';

@Injectable()
export class StockExitService {
  constructor(
    @InjectRepository(StockExit)
    private readonly stockExitRepository: Repository<StockExit>,
    private readonly dataSource: DataSource,
  ) {}

  async create(createStockExitDto: CreateStockExitDto) {
    const stockEntryRepository = this.dataSource.getRepository(StockEntry);
    const customerRepository = this.dataSource.getRepository(Customer);

    const stockEntry = await stockEntryRepository.findOneBy({
      serialNumber: createStockExitDto.stockEntrySerialNumber,
    });
    if (!stockEntry) {
      throw new NotFoundException('Stock entry not found');
    }

    if (stockEntry.origin !== StockEntryOrigin.FROM_SIMPLE_SUPPLIER_ORDER) {
      throw new BadRequestException(
        'Only simple stock entries can be sold from the product screen',
      );
    }

    if (stockEntry.customerOfferId) {
      throw new BadRequestException(
        'Stock entry is reserved to an offer and cannot be sold directly',
      );
    }

    const [customerExists, existingStockExit] = await Promise.all([
      customerRepository.existsBy({ id: createStockExitDto.customerId }),
      this.stockExitRepository.findOneBy({
        stockEntrySerialNumber: createStockExitDto.stockEntrySerialNumber,
      }),
    ]);

    if (!customerExists) {
      throw new NotFoundException('Customer not found');
    }

    if (existingStockExit) {
      throw new BadRequestException(
        'A stock exit already exists for this serial number',
      );
    }

    const now = createStockExitDto.invoiceDate ?? new Date();
    const warrantyExpirationDate =
      createStockExitDto.warrantyExpirationDate ??
      new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());

    const stockExit = this.stockExitRepository.create({
      stockEntrySerialNumber: createStockExitDto.stockEntrySerialNumber,
      customerId: createStockExitDto.customerId,
      customerOfferId: undefined,
      source: StockExitSource.DIRECT_SALE,
      invoiceDate: now,
      invoiceNumber: createStockExitDto.invoiceNumber ?? 'N/A',
      exitPriceRon: createStockExitDto.exitPriceRon ?? 0,
      exitPriceEur: createStockExitDto.exitPriceEur ?? 0,
      sourceCountry: createStockExitDto.sourceCountry ?? 'Romania',
      destinationCountry: createStockExitDto.destinationCountry ?? 'Romania',
      productLocalization:
        createStockExitDto.productLocalization ?? 'La client',
      observations: createStockExitDto.observations ?? '',
      declarationOfConformityNumber:
        createStockExitDto.declarationOfConformityNumber ?? 'N/A',
      declarationOfConformityDate:
        createStockExitDto.declarationOfConformityDate ?? now,
      handoverReceptionReportNumber:
        createStockExitDto.handoverReceptionReportNumber ?? 'N/A',
      handoverReceptionReportDate:
        createStockExitDto.handoverReceptionReportDate ?? now,
      warrantyQualityCertificateNumber:
        createStockExitDto.warrantyQualityCertificateNumber ?? 'N/A',
      warrantyQualityCertificateDate:
        createStockExitDto.warrantyQualityCertificateDate ?? now,
      warrantyStatus: createStockExitDto.warrantyStatus ?? 'UNKNOWN',
      warrantyExpirationDate,
      physicallyDelivered: createStockExitDto.physicallyDelivered ?? false,
      custodyReportNumber: createStockExitDto.custodyReportNumber,
      custodyReportDate: createStockExitDto.custodyReportDate,
    });

    return this.stockExitRepository.save(stockExit);
  }

  async findAllByCustomerOfferId(customerOfferId: number, dto: FindDto) {
    const [results, total] = await this.stockExitRepository.findAndCount({
      where: { stockEntry: { customerOfferId } },
      order: { createdAt: 'DESC' },
      skip: dto.offset,
      take: dto.limit > 0 ? dto.limit : undefined,
    });

    return { results, total };
  }

  async findOne(id: number) {
    const stockExit = await this.stockExitRepository.findOne({
      where: { id },
      relations: ['customer'],
    });
    if (!stockExit) {
      throw new NotFoundException('Stock exit not found');
    }
    return stockExit;
  }

  async update(id: number, updateStockExitDto: UpdateStockExitDto) {
    const stockExit = await this.stockExitRepository.findOneBy({ id });
    if (!stockExit) {
      throw new NotFoundException('Stock exit not found');
    }

    const { stockEntrySerialNumber, customerId, ...updateFields } =
      updateStockExitDto;

    await this.stockExitRepository.update({ id }, updateFields);
    return { message: 'Stock exit updated successfully' };
  }

  async remove(id: number) {
    const stockExit = await this.stockExitRepository.findOneBy({ id });
    if (!stockExit) {
      throw new NotFoundException('Stock exit not found');
    }
    await this.stockExitRepository.delete({ id });
    return { message: 'Stock exit deleted successfully' };
  }
}
