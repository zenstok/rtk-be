import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePriceAnalysisSupplierGroupDto {
  @ApiProperty()
  @IsInt()
  @Type(() => Number)
  supplierId: number;

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  transportationCost: number;

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  importExportCost: number;

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  financialCost: number;
}
