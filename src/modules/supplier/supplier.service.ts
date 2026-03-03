import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, ILike } from 'typeorm';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { CreateSupplierContactPersonDto } from './dto/create-supplier-contact-person.dto';
import { UpdateSupplierContactPersonDto } from './dto/update-supplier-contact-person.dto';
import { SupplierRepository } from './repositories/supplier.repository';
import { SupplierContactPersonRepository } from './repositories/supplier-contact-person.repository';
import { Supplier } from './entities/supplier.entity';
import { SupplierContactPerson } from './entities/supplier-contact-person.entity';
import { FindDto } from '../../utils/dtos/find.dto';
import { FindSupplierDto } from './dto/find-supplier.dto';

@Injectable()
export class SupplierService {
  constructor(
    private readonly supplierRepository: SupplierRepository,
    private readonly supplierContactPersonRepository: SupplierContactPersonRepository,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateSupplierDto) {
    const { pickupContactPerson: inlineContact, ...supplierData } = dto;

    if (!inlineContact) {
      return this.supplierRepository.save(supplierData);
    }

    return this.dataSource.transaction(async (manager) => {
      const { pickupContactPersonId: _ignore, ...rest } = supplierData;
      const supplier = await manager.save(Supplier, rest as Partial<Supplier>);

      const contactPerson = await manager.save(SupplierContactPerson, {
        ...inlineContact,
        supplierId: supplier.id,
      });

      await manager.update(Supplier, supplier.id, {
        pickupContactPersonId: contactPerson.id,
      });

      return manager.findOne(Supplier, {
        where: { id: supplier.id },
        relations: { pickupContactPerson: true },
      });
    });
  }

  async findAll(dto: FindSupplierDto) {
    const where = dto.search
      ? [
          { name: ILike(`%${dto.search}%`) },
          { fiscalCode: ILike(`%${dto.search}%`) },
        ]
      : undefined;

    const [results, total] = await this.supplierRepository.findAndCount({
      where,
      order: { name: 'ASC' },
      skip: dto.offset,
      take: dto.limit > 0 ? dto.limit : undefined,
    });
    return { results, total };
  }

  async findOne(id: number) {
    const supplier = await this.supplierRepository.findOne({
      where: { id },
      relations: { pickupContactPerson: true },
    });
    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }
    return supplier;
  }

  async update(id: number, dto: UpdateSupplierDto) {
    if (!(await this.supplierRepository.existsBy({ id }))) {
      throw new NotFoundException('Supplier not found');
    }
    await this.supplierRepository.update({ id }, dto);
    return { message: 'Supplier updated successfully' };
  }

  async remove(id: number) {
    if (!(await this.supplierRepository.existsBy({ id }))) {
      throw new NotFoundException('Supplier not found');
    }
    await this.supplierRepository.delete({ id });
    return { message: 'Supplier deleted successfully' };
  }

  async createContactPerson(
    supplierId: number,
    dto: CreateSupplierContactPersonDto,
  ) {
    if (!(await this.supplierRepository.existsBy({ id: supplierId }))) {
      throw new NotFoundException('Supplier not found');
    }
    return this.supplierContactPersonRepository.save({
      ...dto,
      supplierId,
    });
  }

  async findContactPersonsBySupplier(supplierId: number, dto: FindDto) {
    if (!(await this.supplierRepository.existsBy({ id: supplierId }))) {
      throw new NotFoundException('Supplier not found');
    }
    const [results, total] =
      await this.supplierContactPersonRepository.findAndCount({
        where: { supplierId },
        skip: dto.offset,
        take: dto.limit > 0 ? dto.limit : undefined,
      });
    return { results, total };
  }

  async updateContactPerson(id: number, dto: UpdateSupplierContactPersonDto) {
    if (!(await this.supplierContactPersonRepository.existsBy({ id }))) {
      throw new NotFoundException('Supplier contact person not found');
    }
    await this.supplierContactPersonRepository.update({ id }, dto);
    return { message: 'Supplier contact person updated successfully' };
  }

  async removeContactPerson(id: number) {
    if (!(await this.supplierContactPersonRepository.existsBy({ id }))) {
      throw new NotFoundException('Supplier contact person not found');
    }
    await this.supplierContactPersonRepository.delete({ id });
    return { message: 'Supplier contact person deleted successfully' };
  }
}
