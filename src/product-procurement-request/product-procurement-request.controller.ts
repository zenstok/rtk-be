import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ProductProcurementRequestService } from './product-procurement-request.service';
import { CreateProductProcurementRequestDto } from './dto/create-product-procurement-request.dto';
import { UpdateProductProcurementRequestDto } from './dto/update-product-procurement-request.dto';

@Controller('product-procurement-request')
export class ProductProcurementRequestController {
  constructor(private readonly productProcurementRequestService: ProductProcurementRequestService) {}

  @Post()
  create(@Body() createProductProcurementRequestDto: CreateProductProcurementRequestDto) {
    return this.productProcurementRequestService.create(createProductProcurementRequestDto);
  }

  @Get()
  findAll() {
    return this.productProcurementRequestService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productProcurementRequestService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductProcurementRequestDto: UpdateProductProcurementRequestDto) {
    return this.productProcurementRequestService.update(+id, updateProductProcurementRequestDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productProcurementRequestService.remove(+id);
  }
}
