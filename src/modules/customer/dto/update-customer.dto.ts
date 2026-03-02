import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateCustomerDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  uniqueRegistrationCode?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  tradeRegisterNumber?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  domain?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  euid?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  bank?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  iban?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  bic?: string;
}
