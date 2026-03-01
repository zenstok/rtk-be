import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class UpdateCustomerOfferDto {
  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  closeDate?: string;

  @ApiProperty({ required: false })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  closeProbability?: number;
}
