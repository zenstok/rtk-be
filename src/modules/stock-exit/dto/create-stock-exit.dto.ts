import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateStockExitDto {
  @IsString()
  stockEntrySerialNumber: string;

  @IsNumber()
  @Type(() => Number)
  customerId: number;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  invoiceDate?: Date;

  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  exitPriceRon?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  exitPriceEur?: number;

  @IsOptional()
  @IsString()
  sourceCountry?: string;

  @IsOptional()
  @IsString()
  destinationCountry?: string;

  @IsOptional()
  @IsString()
  productLocalization?: string;

  @IsOptional()
  @IsString()
  observations?: string;

  @IsOptional()
  @IsString()
  declarationOfConformityNumber?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  declarationOfConformityDate?: Date;

  @IsOptional()
  @IsString()
  handoverReceptionReportNumber?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  handoverReceptionReportDate?: Date;

  @IsOptional()
  @IsString()
  warrantyQualityCertificateNumber?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  warrantyQualityCertificateDate?: Date;

  @IsOptional()
  @IsString()
  warrantyStatus?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  warrantyExpirationDate?: Date;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  physicallyDelivered?: boolean;

  @IsOptional()
  @IsString()
  custodyReportNumber?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  custodyReportDate?: Date;
}
