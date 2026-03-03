import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsString,
  ArrayNotEmpty,
  IsDateString,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class FinalizeStockEntryDeliveryDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  serialNumbers: string[];

  @ApiProperty()
  @IsDateString()
  shipmentDate: string;

  @ApiProperty()
  @IsString()
  supplierInvoiceNumber: string;

  @ApiProperty()
  @IsDateString()
  supplierInvoiceDate: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  supplierCurrencyToRonExchangeRate: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dviNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dviDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nirNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  nirDate?: string;
}
