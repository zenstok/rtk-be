import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CustomerOfferService } from './customer-offer.service';
import { CreateCustomerOfferDto } from './dto/create-customer-offer.dto';
import { UpdateCustomerOfferDto } from './dto/update-customer-offer.dto';

@Controller('customer-offer')
export class CustomerOfferController {
  constructor(private readonly customerOfferService: CustomerOfferService) {}

  @Post()
  create(@Body() createCustomerOfferDto: CreateCustomerOfferDto) {
    return this.customerOfferService.create(createCustomerOfferDto);
  }

  @Get()
  findAll() {
    return this.customerOfferService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.customerOfferService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCustomerOfferDto: UpdateCustomerOfferDto) {
    return this.customerOfferService.update(+id, updateCustomerOfferDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.customerOfferService.remove(+id);
  }
}
