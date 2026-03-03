import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, Repository } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import { ProductCategory } from './entities/product-category.entity';
import { FindDto } from '../../utils/dtos/find.dto';
import { FindProductDto } from './dto/find-product.dto';
import { SuppliersProductCatalogService } from '../suppliers-product-catalog/suppliers-product-catalog.service';
import { CreateSuppliersProductCatalogDto } from '../suppliers-product-catalog/dto/create-suppliers-product-catalog.dto';
import { StockEntry } from '../stock-entry/entities/stock-entry.entity';
import { StockExit } from '../stock-exit/entities/stock-exit.entity';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductCategory)
    private readonly productCategoryRepository: Repository<ProductCategory>,
    private readonly catalogService: SuppliersProductCatalogService,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateProductDto) {
    return this.productRepository.save({
      ...dto,
      description: dto.description ?? '',
      hsCode: dto.hsCode ?? '',
      taricCode: dto.taricCode ?? '',
      stock: dto.stock ?? 0,
      reservedStock: dto.reservedStock ?? 0,
    });
  }

  async findAll(dto: FindProductDto) {
    const where: Record<string, unknown> = {};
    if (dto.category) {
      where.category = dto.category;
    }

    const whereClause = dto.search
      ? [
          { ...where, name: ILike(`%${dto.search}%`) },
          { ...where, manufacturerCode: ILike(`%${dto.search}%`) },
          { ...where, manufacturer: ILike(`%${dto.search}%`) },
        ]
      : Object.keys(where).length > 0
        ? where
        : undefined;

    const [results, total] = await this.productRepository.findAndCount({
      where: whereClause,
      order: { name: 'ASC' },
      skip: dto.offset,
      take: dto.limit > 0 ? dto.limit : undefined,
    });
    return { results, total };
  }

  async findOne(id: number) {
    const product = await this.productRepository.findOneBy({ id });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Compute stock values dynamically from stock_entries/stock_exits
    const stockCounts = await this.dataSource
      .getRepository(StockEntry)
      .createQueryBuilder('se')
      .innerJoin('se.stockEntryDelivery', 'sed')
      .innerJoin('sed.supplierOrderRow', 'sor')
      .innerJoin('sor.suppliersProductCatalog', 'spc')
      .leftJoin(StockExit, 'sx', 'sx.stock_entry_serial_number = se.serial_number')
      .where('spc.productId = :productId', { productId: id })
      .andWhere('sx.id IS NULL')
      .select('COUNT(*)::int', 'stock')
      .addSelect(
        'COUNT(CASE WHEN se.customer_offer_id IS NOT NULL THEN 1 END)::int',
        'reservedStock',
      )
      .getRawOne();

    product.stock = stockCounts?.stock ?? 0;
    product.reservedStock = stockCounts?.reservedStock ?? 0;

    return product;
  }

  async update(id: number, dto: UpdateProductDto) {
    const result = await this.productRepository.update({ id }, dto);
    if (result.affected === 0) {
      throw new NotFoundException('Product not found');
    }
    return { message: 'Product updated successfully' };
  }

  async remove(id: number) {
    const result = await this.productRepository.delete({ id });
    if (result.affected === 0) {
      throw new NotFoundException('Product not found');
    }
    return { message: 'Product deleted successfully' };
  }

  // ---- Product-scoped: suppliers (via SuppliersProductCatalog) ----

  async findSuppliersByProduct(productId: number, dto: FindDto) {
    await this.ensureProductExists(productId);
    return this.catalogService.findByProductId(productId, dto);
  }

  async addSupplierToProduct(
    productId: number,
    dto: CreateSuppliersProductCatalogDto,
  ) {
    await this.ensureProductExists(productId);
    return this.catalogService.create(dto);
  }

  async removeSupplierCatalogEntry(productId: number, catalogId: number) {
    await this.ensureProductExists(productId);
    return this.catalogService.remove(catalogId);
  }

  // ---- Product-scoped: stock entries ----
  // Join chain: StockEntry → StockEntryDelivery → SupplierOrderRow → SuppliersProductCatalog (productId)

  async findStockEntriesByProduct(productId: number, dto: FindDto) {
    const qb = this.dataSource
      .getRepository(StockEntry)
      .createQueryBuilder('se')
      .innerJoinAndSelect('se.stockEntryDelivery', 'sed')
      .innerJoinAndSelect('sed.supplierOrderRow', 'sor')
      .leftJoinAndSelect('sor.supplierOrder', 'so')
      .innerJoin('sor.suppliersProductCatalog', 'spc')
      .where('spc.productId = :productId', { productId })
      .orderBy('se.createdAt', 'DESC');

    if (dto.limit > 0) {
      qb.take(dto.limit);
    }
    qb.skip(dto.offset);

    const [results, total] = await qb.getManyAndCount();

    return { results, total };
  }

  // ---- Product-scoped: stock exits ----
  // Join chain: StockExit → StockEntry → StockEntryDelivery → SupplierOrderRow → SuppliersProductCatalog (productId)

  async findStockExitsByProduct(productId: number, dto: FindDto) {
    const qb = this.dataSource
      .getRepository(StockExit)
      .createQueryBuilder('sx')
      .innerJoin('sx.stockEntry', 'se')
      .innerJoin('se.stockEntryDelivery', 'sed')
      .innerJoin('sed.supplierOrderRow', 'sor')
      .innerJoin('sor.suppliersProductCatalog', 'spc')
      .leftJoinAndSelect('sx.customer', 'c')
      .where('spc.productId = :productId', { productId })
      .orderBy('sx.createdAt', 'DESC');

    if (dto.limit > 0) {
      qb.take(dto.limit);
    }
    qb.skip(dto.offset);

    const [results, total] = await qb.getManyAndCount();

    return { results, total };
  }

  // ---- Product-scoped: stock localization aggregates ----

  async findStockLocalization(productId: number) {
    const rows = await this.dataSource
      .getRepository(StockExit)
      .createQueryBuilder('sx')
      .innerJoin('sx.stockEntry', 'se')
      .innerJoin('se.stockEntryDelivery', 'sed')
      .innerJoin('sed.supplierOrderRow', 'sor')
      .innerJoin('sor.suppliersProductCatalog', 'spc')
      .select('sx.productLocalization', 'location')
      .addSelect('COUNT(*)::int', 'count')
      .where('spc.productId = :productId', { productId })
      .groupBy('sx.productLocalization')
      .getRawMany<{ location: string; count: number }>();

    return rows;
  }

  // ---- Product categories ----

  async findAllCategories() {
    const categories = await this.productCategoryRepository.find({
      order: { name: 'ASC' },
    });
    return categories;
  }

  async createCategory(name: string) {
    const existing = await this.productCategoryRepository.findOneBy({ name });
    if (existing) {
      throw new ConflictException('Categoria exista deja');
    }
    return this.productCategoryRepository.save({ name });
  }

  async removeCategory(id: number) {
    const category = await this.productCategoryRepository.findOneBy({ id });
    if (!category) {
      throw new NotFoundException('Categoria nu a fost gasita');
    }
    const usageCount = await this.productRepository.countBy({
      category: category.name,
    });
    if (usageCount > 0) {
      throw new BadRequestException(
        `Categoria "${category.name}" este folosita de ${usageCount} produs(e) si nu poate fi stearsa`,
      );
    }
    await this.productCategoryRepository.delete({ id });
    return { message: 'Categoria a fost stearsa' };
  }

  // ---- helpers ----

  private async ensureProductExists(id: number) {
    if (!(await this.productRepository.existsBy({ id }))) {
      throw new NotFoundException('Product not found');
    }
  }
}
