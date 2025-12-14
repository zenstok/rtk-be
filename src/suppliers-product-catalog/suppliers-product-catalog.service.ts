import { Injectable } from '@nestjs/common';
import { CreateSuppliersProductCatalogDto } from './dto/create-suppliers-product-catalog.dto';
import { UpdateSuppliersProductCatalogDto } from './dto/update-suppliers-product-catalog.dto';

@Injectable()
export class SuppliersProductCatalogService {
  create(createSuppliersProductCatalogDto: CreateSuppliersProductCatalogDto) {
    return 'This action adds a new suppliersProductCatalog';
  }

  findAll() {
    return `This action returns all suppliersProductCatalog`;
  }

  findOne(id: number) {
    return `This action returns a #${id} suppliersProductCatalog`;
  }

  update(id: number, updateSuppliersProductCatalogDto: UpdateSuppliersProductCatalogDto) {
    return `This action updates a #${id} suppliersProductCatalog`;
  }

  remove(id: number) {
    return `This action removes a #${id} suppliersProductCatalog`;
  }
}
