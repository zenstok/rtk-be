import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProductProcurementRequestDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  generationMethod?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  receivingMethod?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  projectName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  projectCode?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  responseDeadlineDate?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  rfq?: string;

  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  assignedUserId?: number;

  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  customerContactPersonId?: number;

  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  ccCustomerContactPersonId?: number;
}
