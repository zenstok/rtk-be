import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDate,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCustomerOfferStockExitDto {
  @ApiProperty()
  @IsString()
  stockEntrySerialNumber: string;

  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  invoiceDate: Date;

  @ApiProperty()
  @IsString()
  invoiceNumber: string;

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  exitPriceRon: number;

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  exitPriceEur: number;

  @ApiProperty()
  @IsString()
  sourceCountry: string;

  @ApiProperty()
  @IsString()
  destinationCountry: string;

  @ApiProperty()
  @IsString()
  productLocalization: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  observations?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  declarationOfConformityNumber?: string;

  @ApiProperty({ required: false })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  declarationOfConformityDate?: Date;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  handoverReceptionReportNumber?: string;

  @ApiProperty({ required: false })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  handoverReceptionReportDate?: Date;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  warrantyQualityCertificateNumber?: string;

  @ApiProperty({ required: false })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  warrantyQualityCertificateDate?: Date;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  warrantyStatus?: string;

  @ApiProperty({ required: false })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  warrantyExpirationDate?: Date;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  physicallyDelivered?: boolean;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  custodyReportNumber?: string;

  @ApiProperty({ required: false })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  custodyReportDate?: Date;
}
