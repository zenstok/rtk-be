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
import { StockExitService } from './stock-exit.service';
import { CreateStockExitDto } from './dto/create-stock-exit.dto';
import { UpdateStockExitDto } from './dto/update-stock-exit.dto';
import { FindDto } from '../../utils/dtos/find.dto';

@Controller('stock-exit')
export class StockExitController {
  constructor(private readonly stockExitService: StockExitService) {}

  @Post()
  create(@Body() createStockExitDto: CreateStockExitDto) {
    return this.stockExitService.create(createStockExitDto);
  }

  @Get('by-customer-offer-id/:customerOfferId')
  findAllByCustomerOfferId(
    @Param('customerOfferId') customerOfferId: number,
    @Query() dto: FindDto,
  ) {
    return this.stockExitService.findAllByCustomerOfferId(customerOfferId, dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.stockExitService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateStockExitDto: UpdateStockExitDto,
  ) {
    return this.stockExitService.update(+id, updateStockExitDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.stockExitService.remove(+id);
  }
}
