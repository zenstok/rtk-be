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

  @ApiProperty()
  @IsString()
  observations: string;

  @ApiProperty()
  @IsString()
  declarationOfConformityNumber: string;

  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  declarationOfConformityDate: Date;

  @ApiProperty()
  @IsString()
  handoverReceptionReportNumber: string;

  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  handoverReceptionReportDate: Date;

  @ApiProperty()
  @IsString()
  warrantyQualityCertificateNumber: string;

  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  warrantyQualityCertificateDate: Date;

  @ApiProperty()
  @IsString()
  warrantyStatus: string;

  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  warrantyExpirationDate: Date;

  @ApiProperty()
  @IsBoolean()
  physicallyDelivered: boolean;

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
