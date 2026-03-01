import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsDateString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateStockEntryDeliveryDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  supplierOrderRowId: number;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantity: number;

  @ApiProperty()
  @IsDateString()
  estimatedShipmentDate: string;
}
