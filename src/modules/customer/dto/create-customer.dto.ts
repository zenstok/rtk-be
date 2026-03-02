import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  address: string;

  @ApiProperty()
  @IsString()
  uniqueRegistrationCode: string;

  @ApiProperty()
  @IsString()
  tradeRegisterNumber: string;

  @ApiProperty()
  @IsString()
  domain: string;

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
