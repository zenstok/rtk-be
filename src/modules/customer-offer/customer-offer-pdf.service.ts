import { Injectable, NotFoundException, StreamableFile } from '@nestjs/common';
import { CustomerOfferService } from './customer-offer.service';
import PDFDocument from 'pdfkit';

@Injectable()
export class CustomerOfferPdfService {
  constructor(
    private readonly customerOfferService: CustomerOfferService,
  ) {}

  async download(id: number): Promise<StreamableFile> {
    const customerOffer = await this.customerOfferService.findOneWithPprRelations(id);

    const productRowsResponse = await this.customerOfferService.findAllProducts(id, {
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
