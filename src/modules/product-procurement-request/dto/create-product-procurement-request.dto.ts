import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductProcurementRequestDto {
  @ApiProperty()
  @IsString()
  category: string;

  @ApiProperty()
  @IsString()
  generationMethod: string;

  @ApiProperty()
  @IsString()
  receivingMethod: string;

  @ApiProperty()
  @IsString()
  projectName: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  projectCode?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  @IsDateString()
  responseDeadlineDate: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  rfq?: string;

  @ApiProperty()
  @IsInt()
  @Type(() => Number)
  assignedUserId: number;

  @ApiProperty()
  @IsInt()
  @Type(() => Number)
  customerId: number;

  @ApiProperty()
  @IsInt()
  @Type(() => Number)
  customerContactPersonId: number;

  @ApiProperty()
  @IsInt()
  @Type(() => Number)
  ccCustomerContactPersonId: number;
}
