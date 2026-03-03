import { PartialType } from '@nestjs/swagger';
import { CreateSuppliersProductCatalogDto } from './create-suppliers-product-catalog.dto';

export class UpdateSuppliersProductCatalogDto extends PartialType(
  CreateSuppliersProductCatalogDto,
) {}
