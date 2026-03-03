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
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateSuppliersProductCatalogDto } from '../suppliers-product-catalog/dto/create-suppliers-product-catalog.dto';
import { FindDto } from '../../utils/dtos/find.dto';
import { FindProductDto } from './dto/find-product.dto';

@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productService.create(dto);
  }

  @Get()
  findAll(@Query() dto: FindProductDto) {
    return this.productService.findAll(dto);
  }

  // ---- Product categories (must be before :id route) ----

  @Get('category')
  findAllCategories() {
    return this.productService.findAllCategories();
  }

  @Post('category')
  createCategory(@Body() body: { name: string }) {
    return this.productService.createCategory(body.name);
  }

  @Delete('category/:categoryId')
  removeCategory(@Param('categoryId') categoryId: number) {
    return this.productService.removeCategory(categoryId);
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.productService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: number, @Body() dto: UpdateProductDto) {
    return this.productService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.productService.remove(id);
  }

  // ---- Product-scoped: associated suppliers ----

  @Get(':id/suppliers')
  findSuppliers(@Param('id') id: number, @Query() dto: FindDto) {
    return this.productService.findSuppliersByProduct(id, dto);
  }

  @Post(':id/suppliers')
  addSupplier(
    @Param('id') id: number,
    @Body() dto: CreateSuppliersProductCatalogDto,
  ) {
    dto.productId = id;
    return this.productService.addSupplierToProduct(id, dto);
  }

  @Delete(':id/suppliers/:catalogId')
  removeSupplier(
    @Param('id') id: number,
    @Param('catalogId') catalogId: number,
  ) {
    return this.productService.removeSupplierCatalogEntry(id, catalogId);
  }

  // ---- Product-scoped: stock entries ----

  @Get(':id/stock-entries')
  findStockEntries(@Param('id') id: number, @Query() dto: FindDto) {
    return this.productService.findStockEntriesByProduct(id, dto);
  }

  // ---- Product-scoped: stock exits ----

  @Get(':id/stock-exits')
  findStockExits(@Param('id') id: number, @Query() dto: FindDto) {
    return this.productService.findStockExitsByProduct(id, dto);
  }

  // ---- Product-scoped: stock localization aggregates ----

  @Get(':id/stock-localization')
  findStockLocalization(@Param('id') id: number) {
    return this.productService.findStockLocalization(id);
  }
}
