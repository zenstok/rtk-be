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
import { CustomerService } from './customer.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreateCustomerContactPersonDto } from './dto/create-customer-contact-person.dto';
import { UpdateCustomerContactPersonDto } from './dto/update-customer-contact-person.dto';
import { FindDto } from '../../utils/dtos/find.dto';

@Controller('customer')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post()
  create(@Body() dto: CreateCustomerDto) {
    return this.customerService.create(dto);
  }

  @Get()
  findAll(@Query() dto: FindDto) {
    return this.customerService.findAll(dto);
  }

  @Post('contact-person')
  createContactPerson(@Body() dto: CreateCustomerContactPersonDto) {
    return this.customerService.createContactPerson(dto.customerId, dto);
  }

  @Patch('contact-person/:id')
  updateContactPerson(
    @Param('id') id: number,
    @Body() dto: UpdateCustomerContactPersonDto,
  ) {
    return this.customerService.updateContactPerson(id, dto);
  }

  @Delete('contact-person/:id')
  removeContactPerson(@Param('id') id: number) {
    return this.customerService.removeContactPerson(id);
  }

  @Get(':id/contact-person')
  findContactPersons(@Param('id') id: number, @Query() dto: FindDto) {
    return this.customerService.findContactPersonsByCustomer(id, dto);
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.customerService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: number, @Body() dto: UpdateCustomerDto) {
    return this.customerService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.customerService.remove(id);
  }
}
