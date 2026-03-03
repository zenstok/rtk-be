import {
  BadRequestException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { CreateCustomerOfferDto } from './dto/create-customer-offer.dto';
import { UpdateCustomerOfferDto } from './dto/update-customer-offer.dto';
import { CreateCustomerOfferStockExitDto } from './dto/create-customer-offer-stock-exit.dto';
import { ReserveCustomerOfferStockEntryDto } from './dto/reserve-customer-offer-stock-entry.dto';
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
import { FindCustomerOfferDto } from './dto/find-customer-offer.dto';
import { UpdateCustomerOfferStatusDto } from './dto/update-customer-offer-status.dto';
import { FindDto } from '../../utils/dtos/find.dto';
import { PriceAnalysisRowRepository } from '../price-analysis/repositories/price-analysis-row.repository';
import { FileService } from '../file/file.service';
import { PriceAnalysis } from '../price-analysis/entities/price-analysis.entity';

@Injectable()
export class CustomerOfferService {
  constructor(
    private readonly customerOfferRepository: CustomerOfferRepository,
    @InjectRepository(PriceAnalysis)
    private readonly priceAnalysisRepository: Repository<PriceAnalysis>,
    @InjectRepository(StockEntry)
    private readonly stockEntryRepository: Repository<StockEntry>,
    @InjectRepository(StockExit)
    private readonly stockExitRepository: Repository<StockExit>,
    private readonly priceAnalysisRowRepository: PriceAnalysisRowRepository,
    private readonly fileService: FileService,
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

    const priceAnalysis = await this.priceAnalysisRepository.findOne({
      where: { id: dto.priceAnalysisId },
      relations: { productProcurementRequest: true },
    });

    if (!priceAnalysis) {
      throw new NotFoundException('Price analysis not found');
    }

    const customerId = priceAnalysis.productProcurementRequest?.customerId;
    if (!customerId) {
      throw new BadRequestException(
        'Cannot create customer offer without a valid customer',
      );
    }

    return this.customerOfferRepository.insert({
      priceAnalysisId: dto.priceAnalysisId,
      customerId,
      status: CustomerOfferStatus.IN_PROGRESS,
    });
  }

  private static readonly STATUS_TRANSITIONS: Record<CustomerOfferStatus, CustomerOfferStatus[]> = {
    [CustomerOfferStatus.IN_PROGRESS]: [CustomerOfferStatus.FINALIZED, CustomerOfferStatus.CANCELED],
    [CustomerOfferStatus.FINALIZED]: [CustomerOfferStatus.SENT_TO_CUSTOMER, CustomerOfferStatus.CANCELED],
    [CustomerOfferStatus.SENT_TO_CUSTOMER]: [CustomerOfferStatus.RECEIVED_CUSTOMER_ORDER, CustomerOfferStatus.CANCELED],
    [CustomerOfferStatus.RECEIVED_CUSTOMER_ORDER]: [CustomerOfferStatus.RECEIVED_CUSTOMER_ORDER, CustomerOfferStatus.CONFIRMED_CUSTOMER_ORDER, CustomerOfferStatus.CANCELED],
    [CustomerOfferStatus.CONFIRMED_CUSTOMER_ORDER]: [CustomerOfferStatus.CANCELED],
    [CustomerOfferStatus.CANCELED]: [],
  };

  async updateStatus(id: number, dto: UpdateCustomerOfferStatusDto) {
    const customerOffer = await this.customerOfferRepository.findOneBy({ id });
    if (!customerOffer) {
      throw new NotFoundException('Customer Offer not found');
    }

    const allowed = CustomerOfferService.STATUS_TRANSITIONS[customerOffer.status];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from ${customerOffer.status} to ${dto.status}`,
      );
    }

    const updateData: Partial<CustomerOffer> = { status: dto.status };

    if (dto.status === CustomerOfferStatus.RECEIVED_CUSTOMER_ORDER) {
      updateData.customerOrderReceivingMethod = dto.customerOrderReceivingMethod;
      updateData.customerOrderNumber = dto.customerOrderNumber;
      updateData.customerOrderFileId = dto.customerOrderFileId;
      updateData.closeDate = customerOffer.closeDate ?? new Date();
      updateData.closeProbability = 100;
    }

    await this.customerOfferRepository.update({ id }, updateData);
    return { message: 'Customer Offer status updated successfully' };
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

  async findAll(dto: FindCustomerOfferDto) {
    const where: Record<string, unknown> = {};
    if (dto.status) {
      where.status = dto.status;
    }

    const [results, total] = await this.customerOfferRepository.findAndCount({
      where,
      relations: {
        customer: true,
        priceAnalysis: {
          productProcurementRequest: {
            assignedUser: true,
          },
        },
      },
      order: { createdAt: 'DESC' },
      skip: dto.offset,
      take: dto.limit > 0 ? dto.limit : undefined,
    });

    return { results, total };
  }

  async findLatestByPriceAnalysisId(priceAnalysisId: number) {
    const customerOffer = await this.customerOfferRepository.findOne({
      where: { priceAnalysisId },
      order: { id: 'DESC' },
    });

    if (!customerOffer) {
      throw new NotFoundException('Customer Offer not found');
    }

    return customerOffer;
  }

  async findAllProducts(id: number, dto: FindDto) {
    const queryParams = {
      customerOfferId: id,
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
          'co.price_analysis_id = pa.id AND co.id = :customerOfferId',
          queryParams,
        )
        .innerJoin('par.suppliersProductCatalog', 'spc')
        .innerJoin('spc.supplier', 's')
        .innerJoin('spc.product', 'p');

    const total = await createBaseQuery().getCount();

    const results: Array<{
      id: number | string;
      suppliersProductCatalogId: number | string;
      unitPrice: number | string;
      totalQuantity: number | string;
      productDiscount: number | string;
      customerDiscount: number | string;
      supplierId: number | string;
      supplierName: string;
      productId: number | string;
      productName: string;
      manufacturerCode: string;
      manufacturer: string;
      unitOfMeasurement: string;
      supplierOrderQuantity: number | string;
      reservedQuantity: number | string;
    }> = await createBaseQuery()
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
        'p.manufacturer AS "manufacturer"',
        'p.unit_of_measurement AS "unitOfMeasurement"',
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

  async findOneWithPprRelations(id: number) {
    const customerOffer = await this.customerOfferRepository.findOne({
      where: { id },
      relations: {
        customer: true,
        priceAnalysis: {
          productProcurementRequest: {
            assignedUser: true,
            customerContactPerson: true,
            ccCustomerContactPerson: true,
          },
        },
      },
    });

    if (!customerOffer) {
      throw new NotFoundException('Customer Offer not found');
    }

    return customerOffer;
  }

  async downloadConfirmedCustomerOrder(id: number): Promise<StreamableFile> {
    const customerOffer = await this.customerOfferRepository.findOneBy({ id });
    if (!customerOffer) {
      throw new NotFoundException('Customer Offer not found');
    }

    if (!customerOffer.customerOrderFileId) {
      throw new NotFoundException('Customer order file not found');
    }

    return this.fileService.getFileStream(customerOffer.customerOrderFileId);
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
      .leftJoinAndSelect('se.stockEntryDelivery', 'sed')
      .leftJoinAndSelect('sed.supplierOrderRow', 'sor')
      .leftJoinAndSelect('sor.suppliersProductCatalog', 'spc')
      .leftJoinAndSelect('spc.product', 'p')
      .where('se.customer_offer_id = :customerOfferId', { customerOfferId })
      .andWhere('sx.id IS NULL')
      .getMany();
  }

  async findStockExits(customerOfferId: number): Promise<StockExit[]> {
    return this.stockExitRepository
      .createQueryBuilder('sx')
      .innerJoinAndSelect('sx.stockEntry', 'se')
      .leftJoinAndSelect('sx.customer', 'c')
      .leftJoinAndSelect('se.stockEntryDelivery', 'sed')
      .leftJoinAndSelect('sed.supplierOrderRow', 'sor')
      .leftJoinAndSelect('sor.suppliersProductCatalog', 'spc')
      .leftJoinAndSelect('spc.product', 'p')
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

  async reserveStockEntry(
    customerOfferId: number,
    dto: ReserveCustomerOfferStockEntryDto,
  ) {
    const customerOffer = await this.customerOfferRepository.findOneBy({
      id: customerOfferId,
    });
    if (!customerOffer) {
      throw new NotFoundException('Customer offer not found');
    }

    const stockEntry = await this.stockEntryRepository
      .createQueryBuilder('se')
      .leftJoin(
        StockExit,
        'sx',
        'sx.stock_entry_serial_number = se.serial_number',
      )
      .where('se.serial_number = :serialNumber', {
        serialNumber: dto.stockEntrySerialNumber,
      })
      .andWhere('se.origin = :origin', {
        origin: StockEntryOrigin.FROM_SIMPLE_SUPPLIER_ORDER,
      })
      .andWhere('sx.id IS NULL')
      .getOne();

    if (!stockEntry) {
      throw new NotFoundException(
        'Stock entry not found or cannot be reserved',
      );
    }

    if (stockEntry.customerOfferId === customerOfferId) {
      return { message: 'Stock entry is already reserved to this offer' };
    }

    if (stockEntry.customerOfferId) {
      throw new BadRequestException(
        'Stock entry is already reserved to another offer',
      );
    }

    // Resolve the suppliersProductCatalogId for this stock entry
    const entryInfo = await this.stockEntryRepository
      .createQueryBuilder('se')
      .innerJoin('se.stockEntryDelivery', 'sed')
      .innerJoin('sed.supplierOrderRow', 'sor')
      .select('sor.suppliers_product_catalog_id', 'suppliersProductCatalogId')
      .where('se.serial_number = :serialNumber', {
        serialNumber: dto.stockEntrySerialNumber,
      })
      .getRawOne();

    if (entryInfo) {
      const spcId = entryInfo.suppliersProductCatalogId;

      // Check free quantity for this product in this offer
      const productRow = await this.priceAnalysisRowRepository
        .createQueryBuilder('par')
        .innerJoin('par.priceAnalysisSupplierGroup', 'pasg')
        .innerJoin('pasg.priceAnalysis', 'pa')
        .innerJoin(
          CustomerOffer,
          'co',
          'co.price_analysis_id = pa.id AND co.id = :customerOfferId',
          { customerOfferId },
        )
        .where('par.suppliers_product_catalog_id = :spcId', { spcId })
        .select('par.quantity', 'totalQuantity')
        .addSelect(
          `COALESCE((
            SELECT SUM(sor2.ordered_quantity)
            FROM supplier_order_rows sor2
            INNER JOIN supplier_orders so2 ON sor2.supplier_order_id = so2.id
            WHERE so2.customer_offer_id = :customerOfferId
            AND so2.status != :canceledOrderStatus
            AND sor2.suppliers_product_catalog_id = :spcId
          ), 0)`,
          'supplierOrderQuantity',
        )
        .addSelect(
          `COALESCE((
            SELECT COUNT(se2.serial_number)
            FROM stock_entries se2
            INNER JOIN stock_entry_deliveries sed2 ON se2.stock_entry_delivery_id = sed2.id
            INNER JOIN supplier_order_rows sor2 ON sed2.supplier_order_row_id = sor2.id
            WHERE se2.customer_offer_id = :customerOfferId
            AND se2.origin = :simpleOrigin
            AND sor2.suppliers_product_catalog_id = :spcId
          ), 0)`,
          'reservedQuantity',
        )
        .setParameters({
          customerOfferId,
          canceledOrderStatus: SupplierOrderStatus.CANCELED,
          simpleOrigin: StockEntryOrigin.FROM_SIMPLE_SUPPLIER_ORDER,
          spcId,
        })
        .getRawOne();

      if (productRow) {
        const freeQuantity =
          Number(productRow.totalQuantity) -
          Number(productRow.supplierOrderQuantity) -
          Number(productRow.reservedQuantity);
        if (freeQuantity <= 0) {
          throw new BadRequestException(
            'Nu se poate rezerva: cantitatea libera pentru acest produs este deja 0.',
          );
        }
      }
    }

    await this.stockEntryRepository.update(
      { serialNumber: stockEntry.serialNumber },
      { customerOfferId },
    );

    return { message: 'Stock entry reserved successfully' };
  }

  async unreserveStockEntry(
    customerOfferId: number,
    dto: ReserveCustomerOfferStockEntryDto,
  ) {
    const stockEntry = await this.stockEntryRepository.findOneBy({
      serialNumber: dto.stockEntrySerialNumber,
    });

    if (!stockEntry) {
      throw new NotFoundException('Stock entry not found');
    }

    if (stockEntry.customerOfferId !== customerOfferId) {
      throw new BadRequestException(
        'Stock entry is not reserved to this offer',
      );
    }

    if (stockEntry.origin !== StockEntryOrigin.FROM_SIMPLE_SUPPLIER_ORDER) {
      throw new BadRequestException(
        'Only stock entries from simple supplier orders can be unreserved',
      );
    }

    const hasStockExit = await this.stockExitRepository
      .createQueryBuilder('sx')
      .where('sx.stock_entry_serial_number = :serialNumber', {
        serialNumber: dto.stockEntrySerialNumber,
      })
      .getOne();

    if (hasStockExit) {
      throw new BadRequestException(
        'Cannot unreserve a stock entry that already has a stock exit',
      );
    }

    await this.stockEntryRepository.update(
      { serialNumber: stockEntry.serialNumber },
      { customerOfferId: null },
    );

    return { message: 'Stock entry unreserved successfully' };
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
