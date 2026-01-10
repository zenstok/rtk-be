import { PartialType } from '@nestjs/mapped-types';
import { CreateProductProcurementRequestDto } from './create-product-procurement-request.dto';

export class UpdateProductProcurementRequestDto extends PartialType(CreateProductProcurementRequestDto) {}
