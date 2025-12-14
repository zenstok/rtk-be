import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SupplierOrderService } from './supplier-order.service';
import { CreateSupplierOrderDto } from './dto/create-supplier-order.dto';
import { UpdateSupplierOrderDto } from './dto/update-supplier-order.dto';

@Controller('supplier-order')
export class SupplierOrderController {
  constructor(private readonly supplierOrderService: SupplierOrderService) {}

  @Post()
  create(@Body() createSupplierOrderDto: CreateSupplierOrderDto) {
    return this.supplierOrderService.create(createSupplierOrderDto);
  }

  @Get()
  findAll() {
    return this.supplierOrderService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.supplierOrderService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSupplierOrderDto: UpdateSupplierOrderDto) {
    return this.supplierOrderService.update(+id, updateSupplierOrderDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.supplierOrderService.remove(+id);
  }
}
