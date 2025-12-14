import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PriceAnalysisService } from './price-analysis.service';
import { CreatePriceAnalysisDto } from './dto/create-price-analysis.dto';
import { UpdatePriceAnalysisDto } from './dto/update-price-analysis.dto';

@Controller('price-analysis')
export class PriceAnalysisController {
  constructor(private readonly priceAnalysisService: PriceAnalysisService) {}

  @Post()
  create(@Body() createPriceAnalysisDto: CreatePriceAnalysisDto) {
    return this.priceAnalysisService.create(createPriceAnalysisDto);
  }

  @Get()
  findAll() {
    return this.priceAnalysisService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.priceAnalysisService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePriceAnalysisDto: UpdatePriceAnalysisDto) {
    return this.priceAnalysisService.update(+id, updatePriceAnalysisDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.priceAnalysisService.remove(+id);
  }
}
