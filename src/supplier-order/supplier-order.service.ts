import { Injectable } from '@nestjs/common';
import { CreateSupplierOrderDto } from './dto/create-supplier-order.dto';
import { UpdateSupplierOrderDto } from './dto/update-supplier-order.dto';

@Injectable()
export class SupplierOrderService {
  create(createSupplierOrderDto: CreateSupplierOrderDto) {
    return 'This action adds a new supplierOrder';
  }

  findAll() {
    return `This action returns all supplierOrder`;
  }

  findOne(id: number) {
    return `This action returns a #${id} supplierOrder`;
  }

  update(id: number, updateSupplierOrderDto: UpdateSupplierOrderDto) {
    return `This action updates a #${id} supplierOrder`;
  }

  remove(id: number) {
    return `This action removes a #${id} supplierOrder`;
  }
}
