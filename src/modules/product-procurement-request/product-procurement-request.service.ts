import { Injectable } from '@nestjs/common';
import { CreateProductProcurementRequestDto } from './dto/create-product-procurement-request.dto';
import { UpdateProductProcurementRequestDto } from './dto/update-product-procurement-request.dto';

@Injectable()
export class ProductProcurementRequestService {
  create(createProductProcurementRequestDto: CreateProductProcurementRequestDto) {
    return 'This action adds a new productProcurementRequest';
  }

  findAll() {
    return `This action returns all productProcurementRequest`;
  }

  findOne(id: number) {
    return `This action returns a #${id} productProcurementRequest`;
  }

  update(id: number, updateProductProcurementRequestDto: UpdateProductProcurementRequestDto) {
    return `This action updates a #${id} productProcurementRequest`;
  }

  remove(id: number) {
    return `This action removes a #${id} productProcurementRequest`;
  }
}
