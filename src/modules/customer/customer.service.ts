import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreateCustomerContactPersonDto } from './dto/create-customer-contact-person.dto';
import { UpdateCustomerContactPersonDto } from './dto/update-customer-contact-person.dto';
import { CustomerRepository } from './repositories/customer.repository';
import { CustomerContactPersonRepository } from './repositories/customer-contact-person.repository';
import { FindDto } from '../../utils/dtos/find.dto';
import { FindCustomerDto } from './dto/find-customer.dto';
import { ILike } from 'typeorm';

@Injectable()
export class CustomerService {
  constructor(
    private readonly customerRepository: CustomerRepository,
    private readonly customerContactPersonRepository: CustomerContactPersonRepository,
  ) {}

  async create(dto: CreateCustomerDto) {
    return this.customerRepository.save(dto);
  }

  async findAll(dto: FindCustomerDto) {
    const where = dto.search
      ? [
          { name: ILike(`%${dto.search}%`) },
          { uniqueRegistrationCode: ILike(`%${dto.search}%`) },
        ]
      : undefined;

    const [results, total] = await this.customerRepository.findAndCount({
      where,
      order: { name: 'ASC' },
      skip: dto.offset,
      take: dto.limit > 0 ? dto.limit : undefined,
    });
    return { results, total };
  }

  async findOne(id: number) {
    const customer = await this.customerRepository.findOneBy({ id });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    return customer;
  }

  async update(id: number, dto: UpdateCustomerDto) {
    if (!(await this.customerRepository.existsBy({ id }))) {
      throw new NotFoundException('Customer not found');
    }
    await this.customerRepository.update({ id }, dto);
    return { message: 'Customer updated successfully' };
  }

  async remove(id: number) {
    if (!(await this.customerRepository.existsBy({ id }))) {
      throw new NotFoundException('Customer not found');
    }
    await this.customerRepository.delete({ id });
    return { message: 'Customer deleted successfully' };
  }

  async createContactPerson(
    customerId: number,
    dto: CreateCustomerContactPersonDto,
  ) {
    if (!(await this.customerRepository.existsBy({ id: customerId }))) {
      throw new NotFoundException('Customer not found');
    }
    return this.customerContactPersonRepository.save({
      ...dto,
      customerId,
    });
  }

  async findContactPersonsByCustomer(customerId: number, dto: FindDto) {
    if (!(await this.customerRepository.existsBy({ id: customerId }))) {
      throw new NotFoundException('Customer not found');
    }
    const [results, total] =
      await this.customerContactPersonRepository.findAndCount({
        where: { customerId },
        skip: dto.offset,
        take: dto.limit > 0 ? dto.limit : undefined,
      });
    return { results, total };
  }

  async updateContactPerson(id: number, dto: UpdateCustomerContactPersonDto) {
    if (!(await this.customerContactPersonRepository.existsBy({ id }))) {
      throw new NotFoundException('Customer contact person not found');
    }
    await this.customerContactPersonRepository.update({ id }, dto);
    return { message: 'Customer contact person updated successfully' };
  }

  async removeContactPerson(id: number) {
    if (!(await this.customerContactPersonRepository.existsBy({ id }))) {
      throw new NotFoundException('Customer contact person not found');
    }
    await this.customerContactPersonRepository.delete({ id });
    return { message: 'Customer contact person deleted successfully' };
  }
}
