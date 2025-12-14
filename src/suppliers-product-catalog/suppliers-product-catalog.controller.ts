import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SuppliersProductCatalogService } from './suppliers-product-catalog.service';
import { CreateSuppliersProductCatalogDto } from './dto/create-suppliers-product-catalog.dto';
import { UpdateSuppliersProductCatalogDto } from './dto/update-suppliers-product-catalog.dto';

@Controller('suppliers-product-catalog')
export class SuppliersProductCatalogController {
  constructor(private readonly suppliersProductCatalogService: SuppliersProductCatalogService) {}

  @Post()
  create(@Body() createSuppliersProductCatalogDto: CreateSuppliersProductCatalogDto) {
    return this.suppliersProductCatalogService.create(createSuppliersProductCatalogDto);
  }

  @Get()
  findAll() {
    return this.suppliersProductCatalogService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.suppliersProductCatalogService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSuppliersProductCatalogDto: UpdateSuppliersProductCatalogDto) {
    return this.suppliersProductCatalogService.update(+id, updateSuppliersProductCatalogDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.suppliersProductCatalogService.remove(+id);
  }
}
