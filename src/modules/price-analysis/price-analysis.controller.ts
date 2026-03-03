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
import { PriceAnalysisService } from './price-analysis.service';
import { CreatePriceAnalysisDto } from './dto/create-price-analysis.dto';
import { UpdatePriceAnalysisDto } from './dto/update-price-analysis.dto';
import { CreatePriceAnalysisSupplierGroupDto } from './dto/create-price-analysis-supplier-group.dto';
import { UpdatePriceAnalysisSupplierGroupDto } from './dto/update-price-analysis-supplier-group.dto';
import { CreatePriceAnalysisRowDto } from './dto/create-price-analysis-row.dto';
import { UpdatePriceAnalysisRowDto } from './dto/update-price-analysis-row.dto';
import { FindPriceAnalysisDto } from './dto/find-price-analysis.dto';

@Controller('price-analysis')
export class PriceAnalysisController {
  constructor(private readonly priceAnalysisService: PriceAnalysisService) {}

  @Post()
  create(@Body() dto: CreatePriceAnalysisDto) {
    return this.priceAnalysisService.create(dto);
  }

  @Get()
  findAll(@Query() dto: FindPriceAnalysisDto) {
    return this.priceAnalysisService.findAll(dto);
  }

  @Post(':id/duplicate')
  duplicate(@Param('id') id: number) {
    return this.priceAnalysisService.duplicate(id);
  }

  @Post(':id/supplier-group')
  createSupplierGroup(
    @Param('id') id: number,
    @Body() dto: CreatePriceAnalysisSupplierGroupDto,
  ) {
    return this.priceAnalysisService.createSupplierGroup(id, dto);
  }

  @Patch(':id/supplier-group/:groupId')
  updateSupplierGroup(
    @Param('groupId') groupId: number,
    @Body() dto: UpdatePriceAnalysisSupplierGroupDto,
  ) {
    return this.priceAnalysisService.updateSupplierGroup(groupId, dto);
  }

  @Delete(':id/supplier-group/:groupId')
  deleteSupplierGroup(@Param('groupId') groupId: number) {
    return this.priceAnalysisService.deleteSupplierGroup(groupId);
  }

  @Post(':id/supplier-group/:groupId/row')
  createRow(
    @Param('groupId') groupId: number,
    @Body() dto: CreatePriceAnalysisRowDto,
  ) {
    return this.priceAnalysisService.createRow(groupId, dto);
  }

  @Patch(':id/supplier-group/:groupId/row/:rowId')
  updateRow(
    @Param('rowId') rowId: number,
    @Body() dto: UpdatePriceAnalysisRowDto,
  ) {
    return this.priceAnalysisService.updateRow(rowId, dto);
  }

  @Delete(':id/supplier-group/:groupId/row/:rowId')
  deleteRow(@Param('rowId') rowId: number) {
    return this.priceAnalysisService.deleteRow(rowId);
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.priceAnalysisService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: number, @Body() dto: UpdatePriceAnalysisDto) {
    return this.priceAnalysisService.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: number) {
    return this.priceAnalysisService.delete(id);
  }
}
