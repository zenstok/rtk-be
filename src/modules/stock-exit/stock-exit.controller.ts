import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { StockExitService } from './stock-exit.service';
import { CreateStockExitDto } from './dto/create-stock-exit.dto';
import { UpdateStockExitDto } from './dto/update-stock-exit.dto';

@Controller('stock-exit')
export class StockExitController {
  constructor(private readonly stockExitService: StockExitService) {}

  @Post()
  create(@Body() createStockExitDto: CreateStockExitDto) {
    return this.stockExitService.create(createStockExitDto);
  }

  @Get()
  findAll() {
    return this.stockExitService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.stockExitService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateStockExitDto: UpdateStockExitDto) {
    return this.stockExitService.update(+id, updateStockExitDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.stockExitService.remove(+id);
  }
}
