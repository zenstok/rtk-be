import { CustomerOfferStatus } from '../entities/customer-offer.entity';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCustomerOfferStatusDto {
  @ApiProperty()
  @IsEnum(CustomerOfferStatus, {
    message: `type must be one of ${Object.values(CustomerOfferStatus)}`,
  })
  status: CustomerOfferStatus;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  customerOrderReceivingMethod?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  customerOrderNumber?: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  customerOrderFileId?: string;
}
