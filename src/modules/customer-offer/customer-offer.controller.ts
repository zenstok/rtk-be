import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseIntPipe,
  Query,
  Header,
} from '@nestjs/common';
import { CustomerOfferService } from './customer-offer.service';
import { CreateCustomerOfferDto } from './dto/create-customer-offer.dto';
import { UpdateCustomerOfferDto } from './dto/update-customer-offer.dto';
import { CreateCustomerOfferStockExitDto } from './dto/create-customer-offer-stock-exit.dto';
import { ReserveCustomerOfferStockEntryDto } from './dto/reserve-customer-offer-stock-entry.dto';
import { FindCustomerOfferDto } from './dto/find-customer-offer.dto';
import { UpdateCustomerOfferStatusDto } from './dto/update-customer-offer-status.dto';
import { FindDto } from '../../utils/dtos/find.dto';

@Controller('customer-offer')
export class CustomerOfferController {
  constructor(private readonly customerOfferService: CustomerOfferService) {}

  // find all reserved stock entries (find all stock entries with customer offer id = current customer offer)
  // find all UNRESERVED stock entries by product (unreserved stock entry = stock entry with NULL customer offer and NULL stock exit)
  // POST stock-exit based on stock entry (cap tabel in view oferta/view produs: CLIENT | OFERTA | NR. FACT RTK | DATA FACT RTK | PRET IESIRE RON | PRET IESIRE EUR | TARA DESTINATIE | LOCALIZARE PRODUS | BUN LIVRAT FIZIC
  // find all stock exits by customer offer id

  //find all products with cantitate totala (din analiza pret), cantitate comanda furnizor, cantitate rezervata,cantitate liberta
  @Post()
  create(@Body() dto: CreateCustomerOfferDto) {
    return this.customerOfferService.create(dto);
  }

  @Post(':id/update-status')
  updateStatus(
    @Param('id') id: number,
    @Body() dto: UpdateCustomerOfferStatusDto,
  ) {
    return this.customerOfferService.updateStatus(id, dto);
  }

  @Patch(':id')
  update(@Param('id') id: number, @Body() dto: UpdateCustomerOfferDto) {
    return this.customerOfferService.update(id, dto);
  }

  @Get(':id/download')
  @Header('Content-Type', 'application/pdf')
  download(@Param('id') id: number) {
    return this.customerOfferService.download(id);
  }

  @Get(':id/download-confirmed-customer-order')
  downloadConfirmedCustomerOrder(@Param('id', ParseIntPipe) id: number) {
    return this.customerOfferService.downloadConfirmedCustomerOrder(id);
  }

  @Get()
  findAll(@Query() dto: FindCustomerOfferDto) {
    return this.customerOfferService.findAll(dto);
  }

  @Get('by-price-analysis-id/:priceAnalysisId')
  findLatestByPriceAnalysisId(
    @Param('priceAnalysisId') priceAnalysisId: number,
  ) {
    return this.customerOfferService.findLatestByPriceAnalysisId(
      priceAnalysisId,
    );
  }

  @Get(':id/products')
  findAllByCustomerOfferId(@Param('id') id: number, @Query() dto: FindDto) {
    return this.customerOfferService.findAllProducts(id, dto);
  }

  @Get('unreserved-stock-entries/:suppliersProductCatalogId')
  findUnreservedStockEntries(
    @Param('suppliersProductCatalogId') suppliersProductCatalogId: number,
  ) {
    return this.customerOfferService.findUnreservedStockEntries(
      suppliersProductCatalogId,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.customerOfferService.findOne(id);
  }

  @Get(':id/reserved-stock-entries')
  findReservedStockEntries(@Param('id') id: number) {
    return this.customerOfferService.findReservedStockEntries(id);
  }

  @Get(':id/available-stock-entries')
  findAvailableStockEntries(@Param('id') id: number) {
    return this.customerOfferService.findAvailableStockEntries(id);
  }

  @Get(':id/stock-exits')
  findStockExits(@Param('id') id: number) {
    return this.customerOfferService.findStockExits(id);
  }

  @Post(':id/stock-exit')
  createStockExit(
    @Param('id') id: number,
    @Body() dto: CreateCustomerOfferStockExitDto,
  ) {
    return this.customerOfferService.createStockExit(id, dto);
  }

  @Post(':id/reserve-stock-entry')
  reserveStockEntry(
    @Param('id') id: number,
    @Body() dto: ReserveCustomerOfferStockEntryDto,
  ) {
    return this.customerOfferService.reserveStockEntry(id, dto);
  }

  @Post(':id/unreserve-stock-entry')
  unreserveStockEntry(
    @Param('id') id: number,
    @Body() dto: ReserveCustomerOfferStockEntryDto,
  ) {
    return this.customerOfferService.unreserveStockEntry(id, dto);
  }
}
