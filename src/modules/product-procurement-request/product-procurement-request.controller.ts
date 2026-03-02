import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ProductProcurementRequestService } from './product-procurement-request.service';
import { CreateProductProcurementRequestDto } from './dto/create-product-procurement-request.dto';
import { UpdateProductProcurementRequestDto } from './dto/update-product-procurement-request.dto';
import { FindDto } from '../../utils/dtos/find.dto';

@Controller('product-procurement-request')
export class ProductProcurementRequestController {
  constructor(
    private readonly productProcurementRequestService: ProductProcurementRequestService,
  ) {}

  @Post()
  create(@Body() dto: CreateProductProcurementRequestDto) {
    return this.productProcurementRequestService.create(dto);
  }

  @Get()
  findAll(@Query() dto: FindDto) {
    return this.productProcurementRequestService.findAll(dto);
  }

  @Delete(':id/cancel')
  cancel(@Param('id') id: number) {
    return this.productProcurementRequestService.cancel(id);
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.productProcurementRequestService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: number,
    @Body() dto: UpdateProductProcurementRequestDto,
  ) {
    return this.productProcurementRequestService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.productProcurementRequestService.remove(id);
  }
}
