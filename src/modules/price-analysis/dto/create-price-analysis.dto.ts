import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePriceAnalysisDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  productProcurementRequestId: number;
}
