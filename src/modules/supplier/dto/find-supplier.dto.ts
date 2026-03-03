import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { FindDto } from '../../../utils/dtos/find.dto';

export class FindSupplierDto extends FindDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
