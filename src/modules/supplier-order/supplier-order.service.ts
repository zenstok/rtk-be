import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, In, IsNull } from 'typeorm';
import { CreateSupplierOrderDto } from './dto/create-supplier-order.dto';
import { UpdateSupplierOrderDto } from './dto/update-supplier-order.dto';
import { CreateStockEntryDeliveryDto } from './dto/create-stock-entry-delivery.dto';
import { UpdateStockEntryDeliveryDto } from './dto/update-stock-entry-delivery.dto';
import { FinalizeStockEntryDeliveryDto } from './dto/finalize-stock-entry-delivery.dto';
import { CreateSupplierOrderWithReservationDto } from './dto/create-supplier-order-with-reservation.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SupplierOrder,
  SupplierOrderStatus,
} from './entities/supplier-order.entity';
import { SupplierOrderRow } from './entities/supplier-order-row.entity';
import { StockEntryDelivery } from '../stock-entry/entities/stock-entry-delivery.entity';
import {
  StockEntry,
  StockEntryOrigin,
} from '../stock-entry/entities/stock-entry.entity';
import { FindDto } from '../../utils/dtos/find.dto';
import { FindSupplierOrderDto } from './dto/find-supplier-order.dto';


@Injectable()
export class SupplierOrderService {
  constructor(
    @InjectRepository(SupplierOrder)
    private readonly supplierOrderRepository: Repository<SupplierOrder>,
    @InjectRepository(SupplierOrderRow)
    private readonly supplierOrderRowRepository: Repository<SupplierOrderRow>,
    @InjectRepository(StockEntryDelivery)
    private readonly stockEntryDeliveryRepository: Repository<StockEntryDelivery>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateSupplierOrderDto) {
    if (dto.customerOfferId) {
      if (
        dto.orderReference ||
        dto.manualCreationReason ||
        dto.transportationCost != null
      ) {
        throw new BadRequestException(
          'orderReference, manualCreationReason, and transportationCost must not be set for offer-based orders',
        );
      }
    } else {
      if (
        !dto.orderReference ||
        !dto.manualCreationReason ||
        dto.transportationCost == null
      ) {
        throw new BadRequestException(
          'orderReference, manualCreationReason, and transportationCost are required for manual orders',
        );
      }
    }

    const spcIds = dto.rows.map((r) => r.suppliersProductCatalogId);
    if (new Set(spcIds).size !== spcIds.length) {
      throw new BadRequestException(
        'Produse duplicate in randurile comenzii furnizor.',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const { rows, ...orderFields } = dto;

      const order = manager.create(SupplierOrder, {
        ...orderFields,
        status: SupplierOrderStatus.CREATED,
      });
      const savedOrder = await manager.save(SupplierOrder, order);

      const orderRows = rows.map((row) =>
        manager.create(SupplierOrderRow, {
          supplierOrderId: savedOrder.id,
          suppliersProductCatalogId: row.suppliersProductCatalogId,
          unitPrice: row.unitPrice,
          orderedQuantity: row.orderedQuantity,
        }),
      );
      await manager.save(SupplierOrderRow, orderRows);

      return savedOrder;
    });
  }

  async findAll(dto: FindSupplierOrderDto, customerOfferId?: number) {
    const where: Record<string, unknown> = {};
    if (customerOfferId != null) {
      where.customerOfferId = customerOfferId;
    }
    if (dto.status) {
      where.status = dto.status;
    }

    const [results, total] = await this.supplierOrderRepository.findAndCount({
      where: Object.keys(where).length > 0 ? where : undefined,
      relations: {
        supplier: true,
        userInCharge: true,
        assignedUser: true,
      },
      order: { createdAt: 'DESC' },
      skip: dto.offset,
      take: dto.limit > 0 ? dto.limit : undefined,
    });

    return { results, total };
  }

  async findOne(id: number) {
    const order = await this.supplierOrderRepository.findOne({
      where: { id },
      relations: {
        userInCharge: true,
        supplier: true,
        assignedUser: true,
        customerOffer: true,
      },
    });
    if (!order) {
      throw new NotFoundException('Supplier order not found');
    }
    return order;
  }

  async update(id: number, dto: UpdateSupplierOrderDto) {
    const order = await this.supplierOrderRepository.findOneBy({ id });
    if (!order) {
      throw new NotFoundException('Supplier order not found');
    }
    if (order.status === SupplierOrderStatus.CANCELED) {
      throw new BadRequestException('Cannot update a canceled order');
    }

    await this.supplierOrderRepository.update({ id }, dto);
    return { message: 'Supplier order updated successfully' };
  }

  async cancel(id: number) {
    const order = await this.supplierOrderRepository.findOneBy({ id });
    if (!order) {
      throw new NotFoundException('Supplier order not found');
    }
    if (order.status === SupplierOrderStatus.CANCELED) {
      throw new BadRequestException('Supplier order is already canceled');
    }

    await this.supplierOrderRepository.update(
      { id },
      { status: SupplierOrderStatus.CANCELED },
    );
    return { message: 'Supplier order canceled successfully' };
  }

  private static readonly STATUS_ORDER: SupplierOrderStatus[] = [
    SupplierOrderStatus.CREATED,
    SupplierOrderStatus.VALIDATED,
    SupplierOrderStatus.SENT_TO_SUPPLIER,
    SupplierOrderStatus.IN_DELIVERY,
    SupplierOrderStatus.DELIVERED,
  ];

  async updateStatus(id: number, newStatus: SupplierOrderStatus) {
    const order = await this.supplierOrderRepository.findOneBy({ id });
    if (!order) {
      throw new NotFoundException('Supplier order not found');
    }
    if (order.status === SupplierOrderStatus.CANCELED) {
      throw new BadRequestException('Cannot change status of a canceled order');
    }
    if (newStatus === SupplierOrderStatus.CANCELED) {
      throw new BadRequestException(
        'Use the cancel endpoint to cancel an order',
      );
    }

    const currentIndex =
      SupplierOrderService.STATUS_ORDER.indexOf(order.status);
    const newIndex = SupplierOrderService.STATUS_ORDER.indexOf(newStatus);

    if (newIndex < 0) {
      throw new BadRequestException('Invalid target status');
    }
    if (newIndex <= currentIndex) {
      throw new BadRequestException(
        'Status can only be advanced forward, not backwards',
      );
    }

    await this.supplierOrderRepository.update({ id }, { status: newStatus });
    return { message: 'Supplier order status updated successfully' };
  }

  async updateRowPrice(rowId: number, unitPrice: number) {
    const row = await this.supplierOrderRowRepository.findOne({
      where: { id: rowId },
      relations: { supplierOrder: true },
    });
    if (!row) {
      throw new NotFoundException('Supplier order row not found');
    }
    if (row.supplierOrder?.status !== SupplierOrderStatus.CREATED) {
      throw new BadRequestException(
        'Prices can only be modified while the order is in CREATED status',
      );
    }

    await this.supplierOrderRowRepository.update({ id: rowId }, { unitPrice });
    return { message: 'Row price updated successfully' };
  }

  async findProducts(id: number, dto: FindDto) {
    const order = await this.supplierOrderRepository.findOneBy({ id });
    if (!order) {
      throw new NotFoundException('Supplier order not found');
    }

    const [rows, total] = await this.supplierOrderRowRepository.findAndCount({
      where: { supplierOrderId: id },
      relations: { suppliersProductCatalog: { product: true } },
      order: { id: 'ASC' },
      skip: dto.offset,
      take: dto.limit > 0 ? dto.limit : undefined,
    });

    const rowIds = rows.map((row) => row.id);
    const deliveries = rowIds.length
      ? await this.stockEntryDeliveryRepository.find({
          where: { supplierOrderRowId: In(rowIds) },
          relations: { warrantyFile: true, handoverFile: true },
          order: { estimatedShipmentDate: 'ASC', id: 'ASC' },
        })
      : [];

    const deliveriesByRowId = new Map<number, StockEntryDelivery[]>();
    for (const delivery of deliveries) {
      const existing = deliveriesByRowId.get(delivery.supplierOrderRowId) ?? [];
      existing.push(delivery);
      deliveriesByRowId.set(delivery.supplierOrderRowId, existing);
    }

    return {
      results: rows.map((row) => {
        const rowDeliveries = (deliveriesByRowId.get(row.id) ?? []).map(
          (delivery) => ({
            ...delivery,
            quantity: Number(delivery.quantity),
            isShipped: delivery.isShipped(),
          }),
        );

        const deliveredQuantity = rowDeliveries.reduce(
          (sum, delivery) =>
            delivery.shipmentDate ? sum + Number(delivery.quantity) : sum,
          0,
        );
        const orderedQuantity = Number(row.orderedQuantity);

        return {
          ...row,
          unitPrice: Number(row.unitPrice),
          orderedQuantity,
          supplierOrderDeliveries: rowDeliveries,
          deliveredQuantity,
          undeliveredQuantity: orderedQuantity - deliveredQuantity,
        };
      }),
      total,
    };
  }

  async createStockEntryDelivery(
    supplierOrderId: number,
    dto: CreateStockEntryDeliveryDto,
  ) {
    const order = await this.supplierOrderRepository.findOneBy({
      id: supplierOrderId,
    });
    if (!order) {
      throw new NotFoundException('Supplier order not found');
    }

    const row = await this.supplierOrderRowRepository.findOneBy({
      id: dto.supplierOrderRowId,
      supplierOrderId,
    });
    if (!row) {
      throw new NotFoundException(
        'Supplier order row not found for this order',
      );
    }

    const existingDeliveries = await this.stockEntryDeliveryRepository.find({
      where: { supplierOrderRowId: dto.supplierOrderRowId },
    });
    const totalExistingQuantity = existingDeliveries.reduce(
      (sum, d) => sum + d.quantity,
      0,
    );
    if (totalExistingQuantity + dto.quantity > row.orderedQuantity) {
      throw new BadRequestException(
        `Total delivery quantity (${totalExistingQuantity + dto.quantity}) would exceed ordered quantity (${row.orderedQuantity})`,
      );
    }

    const delivery = this.stockEntryDeliveryRepository.create({
      supplierOrderRowId: dto.supplierOrderRowId,
      quantity: dto.quantity,
      estimatedShipmentDate: new Date(dto.estimatedShipmentDate),
    });

    return this.stockEntryDeliveryRepository.save(delivery);
  }

  async finalizeStockEntryDelivery(
    deliveryId: number,
    dto: FinalizeStockEntryDeliveryDto,
  ) {
    const delivery = await this.stockEntryDeliveryRepository.findOne({
      where: { id: deliveryId },
      relations: { supplierOrderRow: { supplierOrder: true } },
    });
    if (!delivery) {
      throw new NotFoundException('Stock entry delivery not found');
    }
    if (delivery.isShipped()) {
      throw new BadRequestException('This delivery has already been finalized');
    }

    if (dto.serialNumbers.length !== delivery.quantity) {
      throw new BadRequestException(
        `Expected ${delivery.quantity} serial numbers, but received ${dto.serialNumbers.length}`,
      );
    }

    const uniqueSerials = new Set(dto.serialNumbers);
    if (uniqueSerials.size !== dto.serialNumbers.length) {
      throw new BadRequestException('Duplicate serial numbers provided');
    }

    const supplierOrder = delivery.supplierOrderRow!.supplierOrder!;

    const origin = supplierOrder.customerOfferId
      ? StockEntryOrigin.FROM_RESERVED_SUPPLIER_ORDER
      : StockEntryOrigin.FROM_SIMPLE_SUPPLIER_ORDER;
    const customerOfferId = supplierOrder.customerOfferId ?? undefined;

    return this.dataSource.transaction(async (manager) => {
      await manager.update(
        StockEntryDelivery,
        { id: deliveryId },
        {
          shipmentDate: new Date(dto.shipmentDate),
          supplierInvoiceNumber: dto.supplierInvoiceNumber,
          supplierInvoiceDate: new Date(dto.supplierInvoiceDate),
          supplierCurrencyToRonExchangeRate:
            dto.supplierCurrencyToRonExchangeRate,
          ...(dto.dviNumber !== undefined && { dviNumber: dto.dviNumber }),
          ...(dto.dviDate && { dviDate: new Date(dto.dviDate) }),
          ...(dto.nirNumber !== undefined && { nirNumber: dto.nirNumber }),
          ...(dto.nirDate && { nirDate: new Date(dto.nirDate) }),
        },
      );

      const stockEntries = dto.serialNumbers.map((serialNumber) =>
        manager.create(StockEntry, {
          serialNumber,
          stockEntryDeliveryId: deliveryId,
          origin,
          customerOfferId,
        }),
      );
      await manager.save(StockEntry, stockEntries);

      return {
        message: 'Delivery finalized successfully',
        stockEntriesCreated: stockEntries.length,
      };
    });
  }

  async updateStockEntryDelivery(
    deliveryId: number,
    dto: UpdateStockEntryDeliveryDto,
  ) {
    const delivery = await this.stockEntryDeliveryRepository.findOneBy({
      id: deliveryId,
    });
    if (!delivery) {
      throw new NotFoundException('Stock entry delivery not found');
    }

    if (delivery.isShipped() && dto.estimatedShipmentDate !== undefined) {
      throw new BadRequestException(
        'Cannot change estimated shipment date after delivery has been shipped',
      );
    }

    const updateData: Partial<StockEntryDelivery> = {};
    if (dto.estimatedShipmentDate !== undefined)
      updateData.estimatedShipmentDate = new Date(dto.estimatedShipmentDate);
    if (dto.awb !== undefined) updateData.awb = dto.awb;
    if (dto.dviNumber !== undefined) updateData.dviNumber = dto.dviNumber;
    if (dto.dviDate !== undefined)
      updateData.dviDate = new Date(dto.dviDate);
    if (dto.nirNumber !== undefined) updateData.nirNumber = dto.nirNumber;
    if (dto.nirDate !== undefined)
      updateData.nirDate = new Date(dto.nirDate);
    if (dto.supplierInvoiceNumber !== undefined)
      updateData.supplierInvoiceNumber = dto.supplierInvoiceNumber;
    if (dto.supplierInvoiceDate !== undefined)
      updateData.supplierInvoiceDate = new Date(dto.supplierInvoiceDate);
    if (dto.supplierCurrencyToRonExchangeRate !== undefined)
      updateData.supplierCurrencyToRonExchangeRate =
        dto.supplierCurrencyToRonExchangeRate;

    await this.stockEntryDeliveryRepository.update(
      { id: deliveryId },
      updateData,
    );
    return { message: 'Stock entry delivery updated successfully' };
  }

  async findStockEntriesBySupplierOrder(id: number, dto: FindDto) {
    const order = await this.supplierOrderRepository.findOneBy({ id });
    if (!order) {
      throw new NotFoundException('Supplier order not found');
    }

    const rows = await this.supplierOrderRowRepository.find({
      where: { supplierOrderId: id },
      relations: { suppliersProductCatalog: { product: true } },
      order: { id: 'ASC' },
    });

    const rowIds = rows.map((row) => row.id);
    if (rowIds.length === 0) {
      return { results: [], total: 0 };
    }

    const deliveries = await this.stockEntryDeliveryRepository.find({
      where: { supplierOrderRowId: In(rowIds) },
      relations: {
        stockEntries: { customerOffer: true },
        warrantyFile: true,
        handoverFile: true,
      },
      order: { estimatedShipmentDate: 'ASC', id: 'ASC' },
    });

    const deliveriesByRowId = new Map<number, StockEntryDelivery[]>();
    for (const delivery of deliveries) {
      const existing = deliveriesByRowId.get(delivery.supplierOrderRowId) ?? [];
      existing.push(delivery);
      deliveriesByRowId.set(delivery.supplierOrderRowId, existing);
    }

    const results = rows.map((row) => {
      const rowDeliveries = (deliveriesByRowId.get(row.id) ?? []).map(
        (delivery) => ({
          ...delivery,
          quantity: Number(delivery.quantity),
          isShipped: delivery.isShipped(),
          stockEntries: delivery.stockEntries ?? [],
        }),
      );

      return {
        ...row,
        orderedQuantity: Number(row.orderedQuantity),
        supplierOrderDeliveries: rowDeliveries,
      };
    });

    return { results, total: rows.length };
  }

  async createWithReservation(dto: CreateSupplierOrderWithReservationDto) {
    if (dto.rows.length > 0) {
      const spcIds = dto.rows.map((r) => r.suppliersProductCatalogId);
      if (new Set(spcIds).size !== spcIds.length) {
        throw new BadRequestException(
          'Produse duplicate in randurile comenzii furnizor.',
        );
      }
    }

    return this.dataSource.transaction(async (manager) => {
      const { rows, ...orderFields } = dto;

      let savedOrder = null;
      if (rows.length > 0) {
        const order = manager.create(SupplierOrder, {
          ...orderFields,
          status: SupplierOrderStatus.CREATED,
        });
        savedOrder = await manager.save(SupplierOrder, order);

        const orderRows = rows.map((row) =>
          manager.create(SupplierOrderRow, {
            supplierOrderId: savedOrder!.id,
            suppliersProductCatalogId: row.suppliersProductCatalogId,
            unitPrice: row.unitPrice,
            orderedQuantity: row.orderedQuantity,
          }),
        );
        await manager.save(SupplierOrderRow, orderRows);
      }

      // Reserve specific serial numbers chosen by the user
      if (dto.reservations?.length) {
        for (const reservation of dto.reservations) {
          if (reservation.serialNumbers.length === 0) continue;
          await manager.update(
            StockEntry,
            {
              serialNumber: In(reservation.serialNumbers),
              origin: StockEntryOrigin.FROM_SIMPLE_SUPPLIER_ORDER,
              customerOfferId: IsNull(),
            },
            { customerOfferId: dto.customerOfferId },
          );
        }
      }

      return savedOrder ?? { message: 'Reservations processed successfully' };
    });
  }
}
