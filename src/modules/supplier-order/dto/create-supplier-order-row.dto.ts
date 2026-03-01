import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSupplierOrderRowDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  suppliersProductCatalogId: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  unitPrice: number;

  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  orderedQuantity: number;
}
