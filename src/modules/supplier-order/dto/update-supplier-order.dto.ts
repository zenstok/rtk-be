import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsBoolean,
  IsOptional,
  IsNumber,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateSupplierOrderDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  supplierOrderRegistrationNumber?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  orderAcknowledgmentNumber?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  orderAcknowledgmentDate?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  customerCommittedDeliveryDate?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  estimatedDeliveryDate?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  endUser?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  partialShipment?: boolean;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  incoterm2010?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  meanOfShipment?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  ourForwardingAgent?: string;

  @ApiProperty({ required: false })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  userInChargeId?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  requestedDeliveryDate?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  remarks?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  termsAndMeanOfPayment?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  pointOfSales?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  otherInstructions?: string;

  @ApiProperty({ required: false })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  assignedUserId?: number;

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
}
