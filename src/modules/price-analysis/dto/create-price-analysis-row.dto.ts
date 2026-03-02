import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePriceAnalysisRowDto {
  @ApiProperty()
  @IsInt()
  @Type(() => Number)
  suppliersProductCatalogId: number;

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  unitPrice: number;

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  quantity: number;

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  productDiscount: number;

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  customerDiscount: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  tariffRate?: number;
}
