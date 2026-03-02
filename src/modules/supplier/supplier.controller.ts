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
import { SupplierService } from './supplier.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { CreateSupplierContactPersonDto } from './dto/create-supplier-contact-person.dto';
import { UpdateSupplierContactPersonDto } from './dto/update-supplier-contact-person.dto';
import { FindDto } from '../../utils/dtos/find.dto';

@Controller('supplier')
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  @Post()
  create(@Body() dto: CreateSupplierDto) {
    return this.supplierService.create(dto);
  }

  @Get()
  findAll(@Query() dto: FindDto) {
    return this.supplierService.findAll(dto);
  }

  @Post('contact-person')
  createContactPerson(@Body() dto: CreateSupplierContactPersonDto) {
    return this.supplierService.createContactPerson(dto.supplierId, dto);
  }

  @Patch('contact-person/:id')
  updateContactPerson(
    @Param('id') id: number,
    @Body() dto: UpdateSupplierContactPersonDto,
  ) {
    return this.supplierService.updateContactPerson(id, dto);
  }

  @Delete('contact-person/:id')
  removeContactPerson(@Param('id') id: number) {
    return this.supplierService.removeContactPerson(id);
  }

  @Get(':id/contact-person')
  findContactPersons(@Param('id') id: number, @Query() dto: FindDto) {
    return this.supplierService.findContactPersonsBySupplier(id, dto);
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.supplierService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: number, @Body() dto: UpdateSupplierDto) {
    return this.supplierService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.supplierService.remove(id);
  }
}
