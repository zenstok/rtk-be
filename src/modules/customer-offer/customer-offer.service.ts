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
import PDFDocument from 'pdfkit';
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
        if (
          customerOffer.status !== CustomerOfferStatus.SENT_TO_CUSTOMER &&
          customerOffer.status !== CustomerOfferStatus.RECEIVED_CUSTOMER_ORDER
        ) {
          throw new BadRequestException(
            `Can set to ${CustomerOfferStatus.RECEIVED_CUSTOMER_ORDER} only if current status is ${CustomerOfferStatus.SENT_TO_CUSTOMER} or ${CustomerOfferStatus.RECEIVED_CUSTOMER_ORDER}`,
          );
        }
        await this.customerOfferRepository.update(
          { id },
          {
            status: CustomerOfferStatus.RECEIVED_CUSTOMER_ORDER,
            customerOrderReceivingMethod: dto.customerOrderReceivingMethod,
            customerOrderNumber: dto.customerOrderNumber,
            customerOrderFileId: dto.customerOrderFileId,
            closeDate: customerOffer.closeDate ?? new Date(),
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

  async download(id: number): Promise<StreamableFile> {
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

    const productRowsResponse = await this.findAllProducts(id, {
      limit: 1000,
      offset: 0,
    });

    const productRows = productRowsResponse.results.map((row) => ({
      id: Number(row.id),
      quantity: Number(row.totalQuantity) || 0,
      unitOfMeasurement: String(row.unitOfMeasurement ?? 'buc.'),
      manufacturer: String(row.manufacturer ?? '-'),
      manufacturerCode: String(row.manufacturerCode ?? '-'),
      productName: String(row.productName ?? '-'),
      unitPrice: Number(row.unitPrice) || 0,
    }));

    const rowsPerPage = 10;
    const totalPages = Math.max(1, Math.ceil(productRows.length / rowsPerPage));
    const pages = Array.from({ length: totalPages }, (_, pageIndex) =>
      productRows.slice(pageIndex * rowsPerPage, (pageIndex + 1) * rowsPerPage),
    );

    const ppr = customerOffer.priceAnalysis?.productProcurementRequest;
    const beneficiaryName = customerOffer.customer?.name ?? '-';
    const offerNumber = this.getOfferNumber(customerOffer.id);
    const offerVersion = '1.0';
    const offerDate = this.formatDate(customerOffer.createdAt);
    const projectName = ppr?.projectName ?? '-';
    const projectCode = ppr?.projectCode?.trim() || '---';
    const rfq = ppr?.rfq?.trim() || '-';
    const customerContact = this.formatCustomerContact(
      ppr?.customerContactPerson,
    );
    const customerCc = this.formatCustomerContact(ppr?.ccCustomerContactPerson);
    const author = this.formatAuthor(ppr?.assignedUser);

    const totalEur = productRows.reduce(
      (sum, row) => sum + row.quantity * row.unitPrice,
      0,
    );

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    const pageWidth = doc.page.width;
    const contentX = 40;
    const contentWidth = pageWidth - contentX * 2;
    const rightX = contentX + contentWidth;

    const drawHeader = (pageNumber: number) => {
      doc
        .font('Helvetica-Bold')
        .fontSize(18)
        .fillColor('#cc0000')
        .text('RomTek Electronics', contentX, 26);
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#000000')
        .text(
          'Str. Siriului nr. 36-40, sector 1, 014354, Bucuresti',
          contentX,
          44,
        )
        .text('Reg. Com.: J40/1858/1998', contentX, 56)
        .text('CUI: RO10274437', contentX, 68);

      doc
        .fontSize(9)
        .text('Tel.: +40 (0)21 269 2008', rightX - 132, 44, { width: 132 })
        .text('+40 (0)31 405 5417', rightX - 132, 56, { width: 132 })
        .text('Fax: +40 (0)21 269 2009', rightX - 132, 68, { width: 132 })
        .text('E-mail: office@romtek.ro', rightX - 132, 80, { width: 132 })
        .text('Website: www.romtek.ro', rightX - 132, 92, { width: 132 });

      doc
        .moveTo(contentX, 108)
        .lineTo(rightX, 108)
        .lineWidth(1)
        .strokeColor('#DDDDDD')
        .stroke();

      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor('#000000')
        .text('Oferta nr. / Data: ', contentX, 116, { continued: true })
        .fillColor('#cc0000')
        .text(`${offerNumber} v${offerVersion}`, { continued: true })
        .fillColor('#000000')
        .text(` / ${offerDate}`);

      doc.fillColor('#000000');
      doc
        .font('Helvetica')
        .fontSize(8)
        .text(`Oferta nr. ${offerNumber} v${offerVersion}`, contentX, 812)
        .text(`pag. ${pageNumber}/${totalPages}`, rightX - 65, 812, {
          width: 65,
          align: 'right',
        });
    };

    const drawOfferMeta = () => {
      const fields: Array<{ label: string; value: string }> = [
        { label: 'Beneficiar:', value: beneficiaryName },
        { label: 'RFQ:', value: rfq },
        { label: 'Nume proiect:', value: projectName },
        { label: 'Cod proiect:', value: projectCode },
        { label: 'Contact:', value: customerContact },
        { label: 'CC:', value: customerCc },
        { label: 'Autor:', value: author },
      ];

      let y = 140;
      for (const field of fields) {
        doc
          .font('Helvetica-Bold')
          .fontSize(10)
          .fillColor('#000000')
          .text(field.label, contentX, y, { width: 74 });
        doc
          .font('Helvetica')
          .fontSize(10)
          .text(field.value, contentX + 78, y, { width: contentWidth - 78 });
        y += 16;
      }
    };

    const drawTableHeader = (startY: number) => {
      const x = {
        crt: contentX,
        quantity: contentX + 28,
        unit: contentX + 52,
        manufacturer: contentX + 78,
        code: contentX + 140,
        description: contentX + 250,
        unitPrice: contentX + 374,
        totalPrice: contentX + 430,
      };

      doc
        .rect(contentX, startY, contentWidth, 30)
        .fillAndStroke('#f0f0f0', '#222222');
      doc.fillColor('#000000');

      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .text('Nr. Crt.', x.crt + 3, startY + 8, { width: 24, align: 'center' })
        .text('Cant.', x.quantity, startY + 8, {
          width: x.unit - x.quantity,
          align: 'center',
        })
        .text('UM', x.unit, startY + 8, {
          width: x.manufacturer - x.unit,
          align: 'center',
        })
        .text('Producator', x.manufacturer, startY + 8, {
          width: x.code - x.manufacturer,
          align: 'center',
        })
        .text('Cod produs', x.code, startY + 8, {
          width: x.description - x.code,
          align: 'center',
        })
        .text('Descriere produs', x.description, startY + 8, {
          width: x.unitPrice - x.description,
          align: 'center',
        })
        .text('Pret unitar (EUR)', x.unitPrice, startY + 8, {
          width: x.totalPrice - x.unitPrice,
          align: 'center',
        })
        .text('Pret total (EUR)', x.totalPrice, startY + 8, {
          width: rightX - x.totalPrice,
          align: 'center',
        });

      const columnSeparators = [
        x.quantity,
        x.unit,
        x.manufacturer,
        x.code,
        x.description,
        x.unitPrice,
        x.totalPrice,
      ];

      for (const currentX of columnSeparators) {
        doc
          .moveTo(currentX, startY)
          .lineTo(currentX, startY + 30)
          .lineWidth(1)
          .strokeColor('#222222')
          .stroke();
      }

      return { colX: x, columnSeparators };
    };

    const drawColumnLines = (
      separators: number[],
      fromY: number,
      toY: number,
      width: number,
      color: string,
    ) => {
      for (const currentX of separators) {
        doc
          .moveTo(currentX, fromY)
          .lineTo(currentX, toY)
          .lineWidth(width)
          .strokeColor(color)
          .stroke();
      }
    };

    const drawTableRows = (
      rows: typeof productRows,
      tableStartY: number,
      firstRowIndex: number,
    ) => {
      const { colX, columnSeparators } = drawTableHeader(tableStartY);
      const rowHeight = 18;
      let y = tableStartY + 30;

      const rowsToRender = [...rows];
      while (rowsToRender.length < rowsPerPage) {
        rowsToRender.push({
          id: -1,
          quantity: 0,
          unitOfMeasurement: '',
          manufacturer: '',
          manufacturerCode: '',
          productName: '',
          unitPrice: 0,
        });
      }

      rowsToRender.forEach((row, index) => {
        doc
          .rect(contentX, y, contentWidth, rowHeight)
          .strokeColor('#444444')
          .lineWidth(0.5)
          .stroke();

        drawColumnLines(columnSeparators, y, y + rowHeight, 0.5, '#444444');

        if (row.id > 0) {
          const rowNumber = firstRowIndex + index + 1;
          const rowTotalPrice = row.quantity * row.unitPrice;

          doc
            .font('Helvetica')
            .fontSize(8)
            .fillColor('#000000')
            .text(String(rowNumber), contentX + 3, y + 5, {
              width: colX.quantity - contentX - 6,
              align: 'center',
            })
            .text(String(row.quantity), colX.quantity, y + 5, {
              width: colX.unit - colX.quantity,
              align: 'center',
            })
            .text(row.unitOfMeasurement, colX.unit, y + 5, {
              width: colX.manufacturer - colX.unit,
              align: 'center',
            })
            .text(row.manufacturer, colX.manufacturer + 2, y + 5, {
              width: colX.code - colX.manufacturer - 4,
            })
            .text(row.manufacturerCode, colX.code + 2, y + 5, {
              width: colX.description - colX.code - 4,
            })
            .text(row.productName, colX.description + 2, y + 5, {
              width: colX.unitPrice - colX.description - 4,
            })
            .text(this.formatAmount(row.unitPrice), colX.unitPrice, y + 5, {
              width: colX.totalPrice - colX.unitPrice - 2,
              align: 'right',
            })
            .text(this.formatAmount(rowTotalPrice), colX.totalPrice, y + 5, {
              width: rightX - colX.totalPrice - 2,
              align: 'right',
            });
        }

        y += rowHeight;
      });

      return y;
    };

    const drawFinalSection = (y: number) => {
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor('#000000')
        .text('TOTAL', contentX, y + 8, { continued: true })
        .font('Helvetica')
        .text(` ${projectName}, EUR, fara TVA:`, { continued: true })
        .font('Helvetica-Bold')
        .text(` ${this.formatAmount(totalEur)}`, rightX - 120, y + 8, {
          width: 120,
          align: 'right',
        });

      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#000000')
        .text(
          'Conditiile comerciale sunt indicate pe ultima pagina a ofertei.',
          contentX,
          y + 34,
        );

      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .text('Clauza de confidentialitate:', contentX, y + 52);

      doc
        .font('Helvetica')
        .fontSize(8)
        .text(
          'Toate informatiile comerciale continute in prezenta oferta (preturi si conditii comerciale) constituie informatii confidentiale ale Partilor',
          contentX,
          y + 68,
          { width: contentWidth },
        )
        .text(
          '(ROMTEK ELECTRONICS SRL si Beneficiarul) si ca atare nu pot fi dezvaluite niciunui tert fara acordul prealabil scris al Partilor.',
          contentX,
          doc.y,
          { width: contentWidth },
        )
        .text(
          'Informatiile tehnice transmise pe parcursul procesului de achizitie initiat prin prezenta oferta vor fi tratate ca informatii confidentiale,',
          contentX,
          doc.y,
          { width: contentWidth },
        )
        .text(
          'cu exceptia datelor tehnice disponibile pentru acces public. In orice situatie, partea care primeste informatiile isi asuma responsabilitatea',
          contentX,
          doc.y,
          { width: contentWidth },
        )
        .text(
          'pentru daunele provocate prin dezvaluirea neautorizata a acestora.',
          contentX,
          doc.y,
          { width: contentWidth },
        );
    };

    pages.forEach((pageRows, pageIndex) => {
      if (pageIndex > 0) {
        doc.addPage({ margin: 40, size: 'A4' });
      }

      drawHeader(pageIndex + 1);

      if (pageIndex === 0) {
        drawOfferMeta();
      }

      const tableStartY = pageIndex === 0 ? 264 : 132;
      const tableEndY = drawTableRows(
        pageRows,
        tableStartY,
        pageIndex * rowsPerPage,
      );

      if (pageIndex === totalPages - 1) {
        drawFinalSection(tableEndY);
      }
    });

    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.end();
    });

    return new StreamableFile(pdfBuffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="oferta-${id}.pdf"`,
      length: pdfBuffer.length,
    });
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
      { customerOfferId: null as any },
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

  private getOfferNumber(id: number): string {
    return `RTK${String(id).padStart(3, '0')}`;
  }

  private formatDate(dateInput?: Date | string | null): string {
    if (!dateInput) {
      return '-';
    }
    const date = new Date(dateInput);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear());
    return `${day}.${month}.${year}`;
  }

  private formatAmount(value: number): string {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  private formatCustomerContact(
    contact?: {
      firstName?: string;
      lastName?: string;
      position?: string;
      email?: string;
      phone?: string;
    } | null,
  ): string {
    const fullName =
      [contact?.firstName, contact?.lastName]
        .filter(Boolean)
        .join(' ')
        .trim() || '-';
    const role = contact?.position?.trim() || '-';
    const emailPart = contact?.email?.trim()
      ? `E: ${contact.email.trim()}`
      : 'E: -';
    const phonePart = contact?.phone?.trim()
      ? `M: ${contact.phone.trim()}`
      : 'M: -';
    return `${fullName} - ${role} (${emailPart}; ${phonePart})`;
  }

  private formatAuthor(
    user?: { firstName?: string; lastName?: string; email?: string } | null,
  ): string {
    const fullName =
      [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || '-';
    const emailPart = user?.email?.trim() ? `E: ${user.email.trim()}` : 'E: -';
    return `${fullName} (${emailPart})`;
  }
}
