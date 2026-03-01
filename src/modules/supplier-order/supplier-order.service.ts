import {
  BadRequestException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { CreateSupplierOrderDto } from './dto/create-supplier-order.dto';
import { UpdateSupplierOrderDto } from './dto/update-supplier-order.dto';
import { CreateStockEntryDeliveryDto } from './dto/create-stock-entry-delivery.dto';
import { FinalizeStockEntryDeliveryDto } from './dto/finalize-stock-entry-delivery.dto';
import { CreateSupplierOrderWithReservationDto } from './dto/create-supplier-order-with-reservation.dto';
import { SupplierOrderRepository } from './repositories/supplier-order.repository';
import { SupplierOrderRowRepository } from './repositories/supplier-order-row.repository';
import { StockEntryDeliveryRepository } from './repositories/stock-entry-delivery.repository';
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
import PDFDocument = require('pdfkit');

@Injectable()
export class SupplierOrderService {
  constructor(
    private readonly supplierOrderRepository: SupplierOrderRepository,
    private readonly supplierOrderRowRepository: SupplierOrderRowRepository,
    private readonly stockEntryDeliveryRepository: StockEntryDeliveryRepository,
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

  async findAll(dto: FindDto) {
    const [results, total] = await this.supplierOrderRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip: dto.offset,
      take: dto.limit > 0 ? dto.limit : undefined,
    });

    return { results, total };
  }

  async findAllByCustomerOfferId(customerOfferId: number, dto: FindDto) {
    const [results, total] = await this.supplierOrderRepository.findAndCount({
      where: { customerOfferId },
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

  async findProducts(id: number, dto: FindDto) {
    const order = await this.supplierOrderRepository.findOneBy({ id });
    if (!order) {
      throw new NotFoundException('Supplier order not found');
    }

    const createBaseQuery = () =>
      this.supplierOrderRowRepository
        .createQueryBuilder('sor')
        .innerJoin('sor.suppliersProductCatalog', 'spc')
        .innerJoin('spc.product', 'p')
        .where('sor.supplier_order_id = :supplierOrderId', {
          supplierOrderId: id,
        });

    const total = await createBaseQuery().getCount();

    const results = await createBaseQuery()
      .select([
        'sor.id AS "id"',
        'sor.suppliers_product_catalog_id AS "suppliersProductCatalogId"',
        'sor.unit_price AS "unitPrice"',
        'sor.ordered_quantity AS "orderedQuantity"',
        'p.name AS "productName"',
        'p.manufacturer_code AS "manufacturerCode"',
      ])
      .addSelect(
        `COALESCE((
          SELECT SUM(sed.quantity)
          FROM stock_entry_deliveries sed
          WHERE sed.supplier_order_row_id = sor.id
          AND sed.shipment_date IS NOT NULL
        ), 0)`,
        'deliveredQuantity',
      )
      .offset(dto.offset)
      .limit(dto.limit > 0 ? dto.limit : undefined)
      .getRawMany();

    return {
      results: results.map((row) => ({
        ...row,
        orderedQuantity: Number(row.orderedQuantity),
        deliveredQuantity: Number(row.deliveredQuantity),
        undeliveredQuantity:
          Number(row.orderedQuantity) - Number(row.deliveredQuantity),
      })),
      total,
    };
  }

  async download(id: number): Promise<StreamableFile> {
    const order = await this.supplierOrderRepository.findOne({
      where: { id },
      relations: {
        supplier: { pickupContactPerson: true },
        userInCharge: true,
        assignedUser: true,
        customerOffer: true,
      },
    });
    if (!order) {
      throw new NotFoundException('Supplier order not found');
    }

    const rows = await this.supplierOrderRowRepository.find({
      where: { supplierOrderId: id },
      relations: { suppliersProductCatalog: { product: true } },
    });

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    const RED = '#CC0000';
    const BLACK = '#000000';
    const pageWidth = doc.page.width - 80; // margins

    // --- Company Header (top-right) ---
    doc
      .fontSize(14)
      .fillColor(RED)
      .text('RomTek Electronics SRL', 0, 40, { align: 'right' });
    doc
      .fontSize(9)
      .fillColor(BLACK)
      .text('Str. Siriului Nr. 36-40', { align: 'right' })
      .text('sector 1, 014354 Bucharest', { align: 'right' })
      .text('ROMANIA', { align: 'right' });
    doc.moveDown(0.3);
    doc.text('VAT No.: RO10274437', { align: 'right' });

    // --- Order Number Box ---
    doc.moveDown(1);
    const orderDate = order.orderAcknowledgmentDate
      ? new Date(order.orderAcknowledgmentDate).toLocaleDateString('ro-RO')
      : '';
    const orderTitle = `ORDER NUMBER : ${order.supplierOrderRegistrationNumber} / ${orderDate}`;
    doc.fontSize(12).font('Helvetica-Bold').text(orderTitle, { align: 'center' });
    doc.font('Helvetica');

    // --- Ship to / Invoice to ---
    doc.moveDown(0.5);
    const addrY = doc.y;
    doc.fontSize(8);
    doc.text('Ship to address:', 40, addrY, { underline: true });
    doc.text('RomTek Electronics S.R.L.', 40, doc.y);
    doc.text('Str. Siriului Nr. 36-40, sector 1, 014354 Bucuresti');
    doc.text('ROMANIA');
    const afterShipY = doc.y;

    doc.text('Invoice to address:', 300, addrY, { underline: true });
    doc.text('RomTek Electronics S.R.L.', 300, doc.y);
    doc.text('Str. Siriului Nr. 36-40, sector 1, 014354 Bucuresti', 300, doc.y);
    doc.text('ROMANIA', 300, doc.y);
    doc.text('VAT No.: RO10274437', 300, doc.y);

    doc.y = Math.max(afterShipY, doc.y);
    doc.moveDown(1);

    // --- End User ---
    doc.fontSize(9).fillColor(RED).text(`End user: ${order.endUser || ''}`);
    doc.fillColor(BLACK);
    doc.moveDown(0.5);

    // --- Supplier Info ---
    const supplier = order.supplier;
    const contact = supplier?.pickupContactPerson;
    doc.fontSize(9);
    doc
      .text('We order to ', { continued: true })
      .font('Helvetica-Bold')
      .text(supplier?.name ?? 'N/A');
    doc.font('Helvetica');
    doc
      .text('Address: ', { continued: true })
      .font('Helvetica-Bold')
      .text(`${supplier?.address ?? ''}, ${supplier?.country ?? ''}`);
    doc.font('Helvetica');
    doc
      .text('VAT No.: ', { continued: true })
      .font('Helvetica-Bold')
      .text(supplier?.fiscalCode ?? '');
    doc.font('Helvetica');
    if (contact) {
      doc
        .text('Contact: ', { continued: true })
        .font('Helvetica-Bold')
        .text(
          `${contact.firstName} ${contact.lastName} - ${contact.position}`,
          { continued: true },
        );
      doc
        .font('Helvetica')
        .text(` (${contact.email}, Tel: ${contact.phone})`);
    }
    doc.moveDown(0.5);

    // --- Product Table ---
    const tableTop = doc.y;
    const colX = {
      item: 40,
      desc: 120,
      qty: 280,
      discount: 315,
      remark: 370,
      unitPrice: 420,
      totalPrice: 500,
    };
    const colHeaders = [
      { x: colX.item, label: 'ITEM' },
      { x: colX.desc, label: 'DESCRIPTION' },
      { x: colX.qty, label: 'QTY' },
      { x: colX.discount, label: 'DISCOUNT\n(%)' },
      { x: colX.remark, label: 'REMARK' },
      { x: colX.unitPrice, label: 'UNIT NET PRICE\n(EUR)' },
      { x: colX.totalPrice, label: 'TOTAL PRICE\n(EUR)' },
    ];

    // Table header
    doc.fontSize(7).font('Helvetica-Bold');
    for (const col of colHeaders) {
      doc.text(col.label, col.x, tableTop, { width: 70 });
    }
    doc.font('Helvetica');

    const headerBottom = tableTop + 25;
    doc
      .moveTo(40, headerBottom)
      .lineTo(40 + pageWidth, headerBottom)
      .stroke();

    // Table rows
    let rowY = headerBottom + 5;
    let netTotal = 0;

    doc.fontSize(7);
    for (const row of rows) {
      const product = row.suppliersProductCatalog?.product;
      const spc = row.suppliersProductCatalog;
      const totalPrice = row.orderedQuantity * row.unitPrice;
      netTotal += totalPrice;

      doc.text(spc?.supplierCode ?? '', colX.item, rowY, { width: 75 });
      const descHeight = doc.heightOfString(product?.name ?? '', {
        width: 155,
      });
      doc.text(product?.name ?? '', colX.desc, rowY, { width: 155 });
      doc.text(String(row.orderedQuantity), colX.qty, rowY, { width: 30 });
      doc.text('', colX.discount, rowY, { width: 45 });
      doc.text('', colX.remark, rowY, { width: 45 });
      doc.text(row.unitPrice.toFixed(2), colX.unitPrice, rowY, { width: 70 });
      doc.text(totalPrice.toFixed(2), colX.totalPrice, rowY, { width: 70 });

      rowY += Math.max(descHeight, 12) + 8;
    }

    // Total line
    doc
      .moveTo(40, rowY)
      .lineTo(40 + pageWidth, rowY)
      .stroke();
    rowY += 5;
    doc
      .font('Helvetica-Bold')
      .text('NET TOTAL PRICE (EUR)', colX.unitPrice - 80, rowY, {
        width: 150,
      });
    doc.text(netTotal.toFixed(2), colX.totalPrice, rowY, { width: 70 });
    doc.font('Helvetica');

    // --- Footer Details ---
    rowY += 25;
    doc.fontSize(9);
    doc.text(
      `Partial shipment: ${order.partialShipment ? 'Allowed' : 'Not allowed'}`,
      40,
      rowY,
    );
    doc.text(`INCOTERM 2010: ${order.incoterm2010}`);
    doc.text(`MEAN OF SHIPMENT: ${order.meanOfShipment}`);
    doc.text(`OUR FORWARDING AGENT: ${order.ourForwardingAgent || ''}`);

    const userInCharge = order.userInCharge;
    doc.text(
      `PERSON IN CHARGE (at RomTek): ${userInCharge ? `${userInCharge.firstName} ${userInCharge.lastName} (${userInCharge.email})` : 'N/A'}`,
    );
    doc.text(`REQUESTED DELIVERY DATE: ${order.requestedDeliveryDate}`);
    doc.text(`REMARKS: ${order.remarks || ''}`);
    doc.moveDown(0.5);
    doc.fillColor(RED);
    doc.text(
      `TERMS, MEAN OF PAYMENT: ${order.termsAndMeanOfPayment}`,
    );
    doc.fillColor(BLACK);
    doc.text(`POS - Point of Sales: ${order.pointOfSales || ''}`);
    doc.moveDown(0.5);
    doc.fillColor(RED);
    doc.text(`OTHER INSTRUCTIONS: ${order.otherInstructions || ''}`);
    doc.fillColor(BLACK);
    doc.moveDown(1);
    doc.text(`DATE :    ${orderDate}`, 40, doc.y, { continued: true });
    doc.text('                    SIGNATURE :', { align: 'right' });

    doc.end();

    const pdfBuffer = await new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    return new StreamableFile(pdfBuffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="supplier-order-${id}.pdf"`,
      length: pdfBuffer.length,
    });
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
      throw new BadRequestException(
        'This delivery has already been finalized',
      );
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
      await manager.update(StockEntryDelivery, { id: deliveryId }, {
        shipmentDate: new Date(),
      });

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

  async createWithReservation(dto: CreateSupplierOrderWithReservationDto) {
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

      // Auto-reserve matching free stock entries for each product catalog
      for (const row of orderRows) {
        const freeStockEntries = await manager
          .createQueryBuilder(StockEntry, 'se')
          .innerJoin(
            StockEntryDelivery,
            'sed',
            'sed.id = se.stock_entry_delivery_id',
          )
          .innerJoin(
            SupplierOrderRow,
            'sor',
            'sor.id = sed.supplier_order_row_id',
          )
          .where('sor.suppliers_product_catalog_id = :spcId', {
            spcId: row.suppliersProductCatalogId,
          })
          .andWhere('se.origin = :origin', {
            origin: StockEntryOrigin.FROM_SIMPLE_SUPPLIER_ORDER,
          })
          .andWhere('se.customer_offer_id IS NULL')
          .getMany();

        if (freeStockEntries.length > 0) {
          const serialNumbers = freeStockEntries.map((se) => se.serialNumber);
          await manager.update(
            StockEntry,
            { serialNumber: In(serialNumbers) },
            { customerOfferId: dto.customerOfferId },
          );
        }
      }

      return savedOrder;
    });
  }
}
