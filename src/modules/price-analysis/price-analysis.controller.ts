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
import { FindDto } from '../../utils/dtos/find.dto';

@Controller('price-analysis')
export class PriceAnalysisController {
  constructor(private readonly priceAnalysisService: PriceAnalysisService) {}

  @Post()
  create(@Body() dto: CreatePriceAnalysisDto) {
    return this.priceAnalysisService.create(dto);
  }

  @Get()
  findAll(@Query() dto: FindDto) {
    return this.priceAnalysisService.findAll(dto);
  }

  @Post(':id/duplicate')
  duplicate(@Param('id') id: number) {
    return this.priceAnalysisService.duplicate(id);
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.priceAnalysisService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: number,
    @Body() updatePriceAnalysisDto: UpdatePriceAnalysisDto,
  ) {
    return this.priceAnalysisService.update(id, updatePriceAnalysisDto);
  }

  @Delete(':id')
  delete(@Param('id') id: number) {
    return this.priceAnalysisService.delete(id);
  }

  @Post(':id/supplier-group')
  createSupplierGroup(@Param('id') id: number, @Body() dto: unknown) {
    return this.priceAnalysisService.createSupplierGroup(id, dto);
  }

  @Patch(':id/supplier-group/:group-id')
  updateSupplierGroup(
    @Param('group-id') groupId: number,
    @Body() dto: unknown,
  ) {
    return this.priceAnalysisService.updateSupplierGroup(groupId, dto);
  }

  @Delete(':id/supplier-group/:group-id')
  deleteSupplierGroup(
    @Param('group-id') groupId: number,
    @Body() dto: unknown,
  ) {
    return this.priceAnalysisService.deleteSupplierGroup(groupId);
  }

  @Post(':id/supplier-group/:group-id/row')
  createPriceAnalysisRow(
    @Param('group-id') groupId: number,
    @Body() dto: unknown,
  ) {
    return this.priceAnalysisService.createRow(groupId, dto);
  }

  @Patch(':id/supplier-group/:group-id/row/:row-id')
  updatePriceAnalysisRow(@Param('row-id') rowId: number, @Body() dto: unknown) {
    return this.priceAnalysisService.updateRow(rowId, dto);
  }

  @Delete(':id/supplier-group/:group-id/row/:row-id')
  deletePriceAnalysisRow(@Param('row-id') rowId: number) {
    return this.priceAnalysisService.delete(rowId);
  }
}
