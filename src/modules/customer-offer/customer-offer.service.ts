import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { CreateCustomerOfferDto } from './dto/create-customer-offer.dto';
import { UpdateCustomerOfferDto } from './dto/update-customer-offer.dto';
import { CreateCustomerOfferStockExitDto } from './dto/create-customer-offer-stock-exit.dto';
import { CustomerOfferRepository } from './repositories/customer-offer.repository';
import {
  CustomerOffer,
  CustomerOfferStatus,
} from './entities/customer-offer.entity';
import {
  StockEntry,
  StockEntryOrigin,
} from '../stock-entry/entities/stock-entry.entity';
import {
  StockExit,
  StockExitSource,
} from '../stock-exit/entities/stock-exit.entity';
import { SupplierOrderStatus } from '../supplier-order/entities/supplier-order.entity';
import { FindDto } from '../../utils/dtos/find.dto';
import { UpdateCustomerOfferStatusDto } from './dto/update-customer-offer-status.dto';
import { PriceAnalysisRowRepository } from '../price-analysis/repositories/price-analysis-row.repository';

@Injectable()
export class CustomerOfferService {
  constructor(
    private readonly customerOfferRepository: CustomerOfferRepository,
    @InjectRepository(StockEntry)
    private readonly stockEntryRepository: Repository<StockEntry>,
    @InjectRepository(StockExit)
    private readonly stockExitRepository: Repository<StockExit>,
    private readonly priceAnalysisRowRepository: PriceAnalysisRowRepository,
  ) {}

  async create(dto: CreateCustomerOfferDto) {
    if (
      await this.customerOfferRepository.existsBy({
        priceAnalysisId: dto.priceAnalysisId,
        status: Not(CustomerOfferStatus.CANCELED),
      })
    ) {
      throw new BadRequestException('Customer Offer has already been created');
    }

    return this.customerOfferRepository.insert({
      priceAnalysisId: dto.priceAnalysisId,
    });
  }

  async updateStatus(id: number, dto: UpdateCustomerOfferStatusDto) {
    const customerOffer = await this.customerOfferRepository.findOneBy({ id });
    if (!customerOffer) {
      throw new NotFoundException('Customer Offer not found');
    }
    switch (dto.status) {
      case CustomerOfferStatus.FINALIZED:
        if (customerOffer.status !== CustomerOfferStatus.IN_PROGRESS) {
          throw new BadRequestException(
            `Can set to ${CustomerOfferStatus.FINALIZED} only if current status is ${CustomerOfferStatus.IN_PROGRESS}`,
          );
        }
        await this.customerOfferRepository.update(
          { id },
          { status: CustomerOfferStatus.FINALIZED },
        );
        return { message: 'Customer Offer status updated successfully' };
      case CustomerOfferStatus.SENT_TO_CUSTOMER:
        if (customerOffer.status !== CustomerOfferStatus.FINALIZED) {
          throw new BadRequestException(
            `Can set to ${CustomerOfferStatus.SENT_TO_CUSTOMER} only if current status is ${CustomerOfferStatus.FINALIZED}`,
          );
        }
        await this.customerOfferRepository.update(
          { id },
          { status: CustomerOfferStatus.SENT_TO_CUSTOMER },
        );
        return { message: 'Customer Offer status updated successfully' };
      case CustomerOfferStatus.RECEIVED_CUSTOMER_ORDER:
        if (customerOffer.status !== CustomerOfferStatus.SENT_TO_CUSTOMER) {
          throw new BadRequestException(
            `Can set to ${CustomerOfferStatus.RECEIVED_CUSTOMER_ORDER} only if current status is ${CustomerOfferStatus.SENT_TO_CUSTOMER}`,
          );
        }
        await this.customerOfferRepository.update(
          { id },
          {
            status: CustomerOfferStatus.RECEIVED_CUSTOMER_ORDER,
            customerOrderReceivingMethod: dto.customerOrderReceivingMethod,
            customerOrderNumber: dto.customerOrderNumber,
            customerOrderFileId: dto.customerOrderFileId,
            closeDate: new Date(),
            closeProbability: 100,
          },
        );
        return { message: 'Customer Offer status updated successfully' };
      case CustomerOfferStatus.CONFIRMED_CUSTOMER_ORDER:
        if (
          customerOffer.status !== CustomerOfferStatus.RECEIVED_CUSTOMER_ORDER
        ) {
          throw new BadRequestException(
            `Can set to ${CustomerOfferStatus.CONFIRMED_CUSTOMER_ORDER} only if current status is ${CustomerOfferStatus.RECEIVED_CUSTOMER_ORDER}`,
          );
        }
        await this.customerOfferRepository.update(
          { id },
          { status: CustomerOfferStatus.CONFIRMED_CUSTOMER_ORDER },
        );
        return { message: 'Customer Offer status updated successfully' };
      case CustomerOfferStatus.CANCELED:
        // cancel customer offer
        // -> should ALSO cancel all stock entry reservations
        await this.customerOfferRepository.update(
          { id },
          { status: CustomerOfferStatus.CANCELED },
        );
        return { message: 'Customer Offer status updated successfully' };
      default:
        throw new BadRequestException('This status cannot be processed.');
    }
  }

  async update(id: number, dto: UpdateCustomerOfferDto) {
    const customerOffer = await this.customerOfferRepository.findOneBy({ id });
    if (!customerOffer) {
      throw new NotFoundException('Customer Offer not found');
    }

    const lockedStatuses: CustomerOfferStatus[] = [
      CustomerOfferStatus.RECEIVED_CUSTOMER_ORDER,
      CustomerOfferStatus.CONFIRMED_CUSTOMER_ORDER,
      CustomerOfferStatus.CANCELED,
    ];

    if (lockedStatuses.includes(customerOffer.status)) {
      throw new BadRequestException(
        'Cannot edit closeDate/closeProbability once the customer order has been received or the offer is canceled',
      );
    }

    await this.customerOfferRepository.update(
      { id },
      {
        closeDate: dto.closeDate ? new Date(dto.closeDate) : undefined,
        closeProbability: dto.closeProbability,
      },
    );

    return { message: 'Customer Offer updated successfully' };
  }

  async findAll(dto: FindDto) {
    const [results, total] = await this.customerOfferRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip: dto.offset,
      take: dto.limit > 0 ? dto.limit : undefined,
    });

    return { results, total };
  }

  async findAllProducts(id: number, dto: FindDto) {
    const queryParams = {
      customerOfferId: id,
      canceledStatus: CustomerOfferStatus.CANCELED,
      canceledOrderStatus: SupplierOrderStatus.CANCELED,
      simpleOrigin: StockEntryOrigin.FROM_SIMPLE_SUPPLIER_ORDER,
    };

    const createBaseQuery = () =>
      this.priceAnalysisRowRepository
        .createQueryBuilder('par')
        .innerJoin('par.priceAnalysisSupplierGroup', 'pasg')
        .innerJoin('pasg.priceAnalysis', 'pa')
        .innerJoin(
          CustomerOffer,
          'co',
          'co.price_analysis_id = pa.id AND co.id = :customerOfferId AND co.status != :canceledStatus',
          queryParams,
        )
        .innerJoin('par.suppliersProductCatalog', 'spc')
        .innerJoin('spc.supplier', 's')
        .innerJoin('spc.product', 'p');

    const total = await createBaseQuery().getCount();

    const results = await createBaseQuery()
      .select([
        'par.id AS "id"',
        'spc.id AS "suppliersProductCatalogId"',
        'par.unit_price AS "unitPrice"',
        'par.quantity AS "totalQuantity"',
        'par.product_discount AS "productDiscount"',
        'par.customer_discount AS "customerDiscount"',
        's.id AS "supplierId"',
        's.name AS "supplierName"',
        'p.id AS "productId"',
        'p.name AS "productName"',
        'p.manufacturer_code AS "manufacturerCode"',
      ])
      .addSelect(
        `COALESCE((
          SELECT SUM(sor.ordered_quantity)
          FROM supplier_order_rows sor
          INNER JOIN supplier_orders so ON sor.supplier_order_id = so.id
          WHERE so.customer_offer_id = :customerOfferId 
          AND so.status != :canceledOrderStatus
          AND sor.suppliers_product_catalog_id = par.suppliers_product_catalog_id
        ), 0)`,
        'supplierOrderQuantity',
      )
      .addSelect(
        `COALESCE((
          SELECT COUNT(se.serial_number)
          FROM stock_entries se
          INNER JOIN stock_entry_deliveries sed ON se.stock_entry_delivery_id = sed.id
          INNER JOIN supplier_order_rows sor ON sed.supplier_order_row_id = sor.id
          WHERE se.customer_offer_id = :customerOfferId
          AND se.origin = :simpleOrigin
          AND sor.suppliers_product_catalog_id = par.suppliers_product_catalog_id
        ), 0)`,
        'reservedQuantity',
      )
      .offset(dto.offset)
      .limit(dto.limit > 0 ? dto.limit : undefined)
      .getRawMany();

    return {
      results: results.map((row) => ({
        ...row,
        totalQuantity: Number(row.totalQuantity),
        supplierOrderQuantity: Number(row.supplierOrderQuantity),
        reservedQuantity: Number(row.reservedQuantity),
        freeQuantity:
          Number(row.totalQuantity) -
          Number(row.supplierOrderQuantity) -
          Number(row.reservedQuantity),
      })),
      total,
    };
  }

  async findOne(id: number) {
    const customerOffer = await this.customerOfferRepository.findOne({
      where: { id },
      relations: {
        customer: true,
        priceAnalysis: true,
        customerOrderFile: true,
      },
    });
    if (!customerOffer) {
      throw new NotFoundException('Customer Offer not found');
    }
    return customerOffer;
  }

  async findAvailableStockEntries(
    customerOfferId: number,
  ): Promise<StockEntry[]> {
    return this.stockEntryRepository
      .createQueryBuilder('se')
      .leftJoin(
        StockExit,
        'sx',
        'sx.stock_entry_serial_number = se.serial_number',
      )
      .where('se.customer_offer_id = :customerOfferId', { customerOfferId })
      .andWhere('sx.id IS NULL')
      .getMany();
  }

  async findStockExits(customerOfferId: number): Promise<StockExit[]> {
    return this.stockExitRepository
      .createQueryBuilder('sx')
      .innerJoin(
        StockEntry,
        'se',
        'sx.stock_entry_serial_number = se.serial_number',
      )
      .where('se.customer_offer_id = :customerOfferId', { customerOfferId })
      .getMany();
  }

  async createStockExit(
    customerOfferId: number,
    dto: CreateCustomerOfferStockExitDto,
  ): Promise<StockExit> {
    const customerOffer = await this.customerOfferRepository.findOneBy({
      id: customerOfferId,
    });
    if (!customerOffer) {
      throw new NotFoundException('Customer offer not found');
    }

    const stockEntry = await this.stockEntryRepository.findOneBy({
      serialNumber: dto.stockEntrySerialNumber,
    });
    if (!stockEntry) {
      throw new NotFoundException('Stock entry not found');
    }
    if (stockEntry.customerOfferId !== customerOfferId) {
      throw new BadRequestException(
        'Stock entry does not belong to this customer offer',
      );
    }

    const existingStockExit = await this.stockExitRepository.findOneBy({
      stockEntrySerialNumber: dto.stockEntrySerialNumber,
    });
    if (existingStockExit) {
      throw new BadRequestException(
        'A stock exit already exists for this serial number',
      );
    }

    const source =
      stockEntry.origin === StockEntryOrigin.FROM_RESERVED_SUPPLIER_ORDER
        ? StockExitSource.FROM_RESERVED_SUPPLIER_ORDER
        : StockExitSource.FROM_OFFER_RESERVATION;

    const stockExit = this.stockExitRepository.create({
      ...dto,
      customerId: customerOffer.customerId,
      source,
    });

    return this.stockExitRepository.save(stockExit);
  }

  async findReservedStockEntries(customerOfferId: number) {
    const entries = await this.stockEntryRepository
      .createQueryBuilder('se')
      .innerJoin('se.stockEntryDelivery', 'sed')
      .innerJoin('sed.supplierOrderRow', 'sor')
      .innerJoin('sor.suppliersProductCatalog', 'spc')
      .innerJoin('spc.product', 'p')
      .leftJoin(
        StockExit,
        'sx',
        'sx.stock_entry_serial_number = se.serial_number',
      )
      .where('se.origin = :origin', {
        origin: StockEntryOrigin.FROM_SIMPLE_SUPPLIER_ORDER,
      })
      .andWhere('se.customer_offer_id = :customerOfferId', { customerOfferId })
      .select([
        'se.serial_number AS "serialNumber"',
        'p.id AS "productId"',
        'p.name AS "productName"',
        'p.manufacturer_code AS "manufacturerCode"',
        'sx.id AS "stockExitId"',
      ])
      .getRawMany();

    const grouped = new Map<
      number,
      {
        productId: number;
        productName: string;
        manufacturerCode: string;
        stockEntries: {
          serialNumber: string;
          stockExitId: number | null;
        }[];
      }
    >();

    for (const entry of entries) {
      if (!grouped.has(entry.productId)) {
        grouped.set(entry.productId, {
          productId: entry.productId,
          productName: entry.productName,
          manufacturerCode: entry.manufacturerCode,
          stockEntries: [],
        });
      }
      grouped.get(entry.productId)!.stockEntries.push({
        serialNumber: entry.serialNumber,
        stockExitId: entry.stockExitId,
      });
    }

    return Array.from(grouped.values());
  }

  async findUnreservedStockEntries(
    suppliersProductCatalogId: number,
  ): Promise<StockEntry[]> {
    return this.customerOfferRepository.findUnreservedStockEntries(
      suppliersProductCatalogId,
    );
  }
}
