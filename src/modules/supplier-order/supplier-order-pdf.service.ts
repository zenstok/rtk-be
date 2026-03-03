import { Injectable, NotFoundException, StreamableFile } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupplierOrder } from './entities/supplier-order.entity';
import { SupplierOrderRow } from './entities/supplier-order-row.entity';
import PDFDocument = require('pdfkit');

@Injectable()
export class SupplierOrderPdfService {
  constructor(
    @InjectRepository(SupplierOrder)
    private readonly supplierOrderRepository: Repository<SupplierOrder>,
    @InjectRepository(SupplierOrderRow)
    private readonly supplierOrderRowRepository: Repository<SupplierOrderRow>,
  ) {}

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
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text(orderTitle, { align: 'center' });
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
    doc
      .fontSize(9)
      .fillColor(RED)
      .text(`End user: ${order.endUser || ''}`);
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
      doc.font('Helvetica').text(` (${contact.email}, Tel: ${contact.phone})`);
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
    const currency = order.supplier?.currency ?? 'EUR';
    const colHeaders = [
      { x: colX.item, label: 'ITEM' },
      { x: colX.desc, label: 'DESCRIPTION' },
      { x: colX.qty, label: 'QTY' },
      { x: colX.discount, label: 'DISCOUNT\n(%)' },
      { x: colX.remark, label: 'REMARK' },
      { x: colX.unitPrice, label: `UNIT NET PRICE\n(${currency})` },
      { x: colX.totalPrice, label: `TOTAL PRICE\n(${currency})` },
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
      .text(`NET TOTAL PRICE (${currency})`, colX.unitPrice - 80, rowY, {
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
    doc.text(`TERMS, MEAN OF PAYMENT: ${order.termsAndMeanOfPayment}`);
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
}
