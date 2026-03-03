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
import { SuppliersProductCatalogService } from './suppliers-product-catalog.service';
import { CreateSuppliersProductCatalogDto } from './dto/create-suppliers-product-catalog.dto';
import { UpdateSuppliersProductCatalogDto } from './dto/update-suppliers-product-catalog.dto';
import { FindDto } from '../../utils/dtos/find.dto';

@Controller('suppliers-product-catalog')
export class SuppliersProductCatalogController {
  constructor(
    private readonly suppliersProductCatalogService: SuppliersProductCatalogService,
  ) {}

  @Post()
  create(@Body() dto: CreateSuppliersProductCatalogDto) {
    return this.suppliersProductCatalogService.create(dto);
  }

  @Get()
  findAll(@Query() dto: FindDto) {
    return this.suppliersProductCatalogService.findAll(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.suppliersProductCatalogService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: number,
    @Body() dto: UpdateSuppliersProductCatalogDto,
  ) {
    return this.suppliersProductCatalogService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.suppliersProductCatalogService.remove(id);
  }
}
