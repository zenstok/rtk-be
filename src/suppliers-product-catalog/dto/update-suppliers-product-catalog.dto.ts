import { PartialType } from '@nestjs/mapped-types';
import { CreateSuppliersProductCatalogDto } from './create-suppliers-product-catalog.dto';

export class UpdateSuppliersProductCatalogDto extends PartialType(CreateSuppliersProductCatalogDto) {}
