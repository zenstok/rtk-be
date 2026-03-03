import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { SupplierOrderStatus } from '../entities/supplier-order.entity';

export class UpdateSupplierOrderStatusDto {
  @ApiProperty({ enum: SupplierOrderStatus })
  @IsEnum(SupplierOrderStatus)
  status: SupplierOrderStatus;
}
