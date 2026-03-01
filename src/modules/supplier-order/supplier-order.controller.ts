import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Header,
} from '@nestjs/common';
import { SupplierOrderService } from './supplier-order.service';
import { CreateSupplierOrderDto } from './dto/create-supplier-order.dto';
import { UpdateSupplierOrderDto } from './dto/update-supplier-order.dto';
import { CreateStockEntryDeliveryDto } from './dto/create-stock-entry-delivery.dto';
import { FinalizeStockEntryDeliveryDto } from './dto/finalize-stock-entry-delivery.dto';
import { CreateSupplierOrderWithReservationDto } from './dto/create-supplier-order-with-reservation.dto';
import { FindDto } from '../../utils/dtos/find.dto';

@Controller('supplier-order')
export class SupplierOrderController {
  constructor(private readonly supplierOrderService: SupplierOrderService) {}

  @Post()
  create(@Body() dto: CreateSupplierOrderDto) {
    return this.supplierOrderService.create(dto);
  }

  @Post('with-reservation')
  createWithReservation(@Body() dto: CreateSupplierOrderWithReservationDto) {
    return this.supplierOrderService.createWithReservation(dto);
  }

  @Get()
  findAll(@Query() dto: FindDto) {
    return this.supplierOrderService.findAll(dto);
  }

  @Get('by-customer-offer-id/:customer-offer-id')
  findAllByCustomerOfferId(
    @Param('customer-offer-id') customerOfferId: number,
    @Query() dto: FindDto,
  ) {
    return this.supplierOrderService.findAllByCustomerOfferId(
      customerOfferId,
      dto,
    );
  }

  @Post('stock-entry-delivery/:deliveryId/finalize')
  finalizeStockEntryDelivery(
    @Param('deliveryId') deliveryId: number,
    @Body() dto: FinalizeStockEntryDeliveryDto,
  ) {
    return this.supplierOrderService.finalizeStockEntryDelivery(
      deliveryId,
      dto,
    );
  }

  @Get(':id/download')
  @Header('Content-Type', 'application/pdf')
  download(@Param('id') id: number) {
    return this.supplierOrderService.download(id);
  }

  @Get(':id/products')
  findProducts(@Param('id') id: number, @Query() dto: FindDto) {
    return this.supplierOrderService.findProducts(id, dto);
  }

  @Post(':id/stock-entry-delivery')
  createStockEntryDelivery(
    @Param('id') id: number,
    @Body() dto: CreateStockEntryDeliveryDto,
  ) {
    return this.supplierOrderService.createStockEntryDelivery(id, dto);
  }

  @Patch(':id')
  update(@Param('id') id: number, @Body() dto: UpdateSupplierOrderDto) {
    return this.supplierOrderService.update(id, dto);
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.supplierOrderService.findOne(id);
  }

  @Delete(':id/cancel')
  cancel(@Param('id') id: number) {
    return this.supplierOrderService.cancel(id);
  }
}
