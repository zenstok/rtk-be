import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ReserveCustomerOfferStockEntryDto {
  @ApiProperty()
  @IsString()
  stockEntrySerialNumber: string;
}
