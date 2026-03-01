import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsString,
  IsBoolean,
  IsOptional,
  IsNumber,
  IsDateString,
  IsArray,
  ValidateNested,
  ArrayNotEmpty,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateSupplierOrderRowDto } from './create-supplier-order-row.dto';

export class CreateSupplierOrderDto {
  @ApiProperty()
  @IsString()
  supplierOrderRegistrationNumber: string;

  @ApiProperty()
  @IsString()
  orderAcknowledgmentNumber: string;

  @ApiProperty()
  @IsDateString()
  orderAcknowledgmentDate: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  customerCommittedDeliveryDate?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  estimatedDeliveryDate?: string;

  @ApiProperty()
  @IsString()
  endUser: string;

  @ApiProperty()
  @IsBoolean()
  partialShipment: boolean;

  @ApiProperty()
  @IsString()
  incoterm2010: string;

  @ApiProperty()
  @IsString()
  meanOfShipment: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  ourForwardingAgent?: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  userInChargeId: number;

  @ApiProperty()
  @IsString()
  requestedDeliveryDate: string;

  @ApiProperty()
  @IsString()
  remarks: string;

  @ApiProperty()
  @IsString()
  termsAndMeanOfPayment: string;

  @ApiProperty()
  @IsString()
  pointOfSales: string;

  @ApiProperty()
  @IsString()
  otherInstructions: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  supplierId: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  assignedUserId: number;

  // --- Fields that distinguish "from offer" vs "manual" creation ---
  // Offer-based: set customerOfferId, leave orderReference/manualCreationReason/transportationCost unset
  // Manual: leave customerOfferId unset, provide orderReference/manualCreationReason/transportationCost

  @ApiProperty({ required: false })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  customerOfferId?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  orderReference?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  manualCreationReason?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  transportationCost?: number;

  // --- Nested rows ---
  @ApiProperty({ type: [CreateSupplierOrderRowDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateSupplierOrderRowDto)
  rows: CreateSupplierOrderRowDto[];
}
