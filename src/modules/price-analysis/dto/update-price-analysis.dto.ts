import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdatePriceAnalysisDto {
  @ApiProperty()
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  projectDiscount?: number;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  vatRate?: number;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  eurToRonExchangeRate?: number;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  usdToRonExchangeRate?: number;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  gbpToRonExchangeRate?: number;
}
