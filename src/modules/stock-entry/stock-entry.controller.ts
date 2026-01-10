import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { StockEntryService } from './stock-entry.service';
import { CreateStockEntryDto } from './dto/create-stock-entry.dto';
import { UpdateStockEntryDto } from './dto/update-stock-entry.dto';

@Controller('stock-entry')
export class StockEntryController {
  constructor(private readonly stockEntryService: StockEntryService) {}

  @Post()
  create(@Body() createStockEntryDto: CreateStockEntryDto) {
    return this.stockEntryService.create(createStockEntryDto);
  }

  @Get()
  findAll() {
    return this.stockEntryService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.stockEntryService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateStockEntryDto: UpdateStockEntryDto) {
    return this.stockEntryService.update(+id, updateStockEntryDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.stockEntryService.remove(+id);
  }
}
