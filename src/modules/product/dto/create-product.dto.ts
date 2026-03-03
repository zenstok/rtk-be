import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  @IsString()
  category: string;

  @ApiProperty()
  @IsString()
  manufacturer: string;

  @ApiProperty()
  @IsString()
  manufacturerCode: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  hsCode?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  taricCode?: string;

  @ApiProperty()
  @IsString()
  unitOfMeasurement: string;

  @ApiProperty({ required: false, default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  stock?: number;

  @ApiProperty({ required: false, default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  reservedStock?: number;
}
