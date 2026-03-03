import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSuppliersProductCatalogDto } from './dto/create-suppliers-product-catalog.dto';
import { UpdateSuppliersProductCatalogDto } from './dto/update-suppliers-product-catalog.dto';
import { SuppliersProductCatalog } from './entities/suppliers-product-catalog.entity';
import { FindDto } from '../../utils/dtos/find.dto';

@Injectable()
export class SuppliersProductCatalogService {
  constructor(
    @InjectRepository(SuppliersProductCatalog)
    private readonly catalogRepository: Repository<SuppliersProductCatalog>,
  ) {}

  async create(dto: CreateSuppliersProductCatalogDto) {
    const alreadyLinked = await this.catalogRepository.existsBy({
      supplierId: dto.supplierId,
      productId: dto.productId,
    });

    if (alreadyLinked) {
      throw new ConflictException(
        'Furnizorul selectat este deja asociat acestui produs.',
      );
    }

    try {
      return this.catalogRepository.save(dto);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException(
          'Furnizorul selectat este deja asociat acestui produs.',
        );
      }
      throw error;
    }
  }

  async findAll(dto: FindDto) {
    const [results, total] = await this.catalogRepository.findAndCount({
      relations: ['supplier', 'product'],
      skip: dto.offset,
      take: dto.limit > 0 ? dto.limit : undefined,
    });
    return { results, total };
  }

  async findByProductId(productId: number, dto: FindDto) {
    const [results, total] = await this.catalogRepository.findAndCount({
      where: { productId },
      relations: ['supplier'],
      skip: dto.offset,
      take: dto.limit > 0 ? dto.limit : undefined,
    });
    return { results, total };
  }

  async findOne(id: number) {
    const entry = await this.catalogRepository.findOne({
      where: { id },
      relations: ['supplier', 'product'],
    });
    if (!entry) {
      throw new NotFoundException('Catalog entry not found');
    }
    return entry;
  }

  async update(id: number, dto: UpdateSuppliersProductCatalogDto) {
    if (!(await this.catalogRepository.existsBy({ id }))) {
      throw new NotFoundException('Catalog entry not found');
    }
    await this.catalogRepository.update({ id }, dto);
    return { message: 'Catalog entry updated successfully' };
  }

  async remove(id: number) {
    if (!(await this.catalogRepository.existsBy({ id }))) {
      throw new NotFoundException('Catalog entry not found');
    }
    try {
      await this.catalogRepository.delete({ id });
    } catch (error) {
      if (this.isForeignKeyViolation(error)) {
        throw new ConflictException(
          'Furnizorul nu poate fi sters deoarece este inclus in analize de pret sau comenzi furnizor.',
        );
      }
      throw error;
    }
    return { message: 'Catalog entry deleted successfully' };
  }

  private isForeignKeyViolation(error: unknown): boolean {
    if (this.extractSqlErrorCode(error) === '23503') {
      return true;
    }
    if (
      error &&
      typeof error === 'object' &&
      'driverError' in error &&
      typeof error.driverError === 'object'
    ) {
      return this.extractSqlErrorCode(error.driverError) === '23503';
    }
    return false;
  }

  private isUniqueViolation(error: unknown): boolean {
    if (this.extractSqlErrorCode(error) === '23505') {
      return true;
    }

    if (
      error &&
      typeof error === 'object' &&
      'driverError' in error &&
      typeof error.driverError === 'object'
    ) {
      return this.extractSqlErrorCode(error.driverError) === '23505';
    }

    return false;
  }

  private extractSqlErrorCode(error: unknown): string | null {
    if (!error || typeof error !== 'object') {
      return null;
    }
    if (!('code' in error) || typeof error.code !== 'string') {
      return null;
    }
    return error.code;
  }
}
