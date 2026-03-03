import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateStockEntryDeliveryDto {
  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  estimatedShipmentDate?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  awb?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  dviNumber?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  dviDate?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  nirNumber?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  nirDate?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  supplierInvoiceNumber?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  supplierInvoiceDate?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  supplierCurrencyToRonExchangeRate?: number;
}
