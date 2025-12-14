import { PartialType } from '@nestjs/mapped-types';
import { CreateSupplierOrderDto } from './create-supplier-order.dto';

export class UpdateSupplierOrderDto extends PartialType(CreateSupplierOrderDto) {}
