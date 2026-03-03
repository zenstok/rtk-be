import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSuppliersProductCatalogDto {
  @ApiProperty()
  @IsInt()
  @Type(() => Number)
  supplierId: number;

  @ApiProperty()
  @IsInt()
  @Type(() => Number)
  productId: number;

  @ApiProperty()
  @IsString()
  supplierCode: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  tariffRate?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  observations?: string;
}
