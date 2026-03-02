import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { SupplierContactPerson } from '../entities/supplier-contact-person.entity';

@Injectable()
export class SupplierContactPersonRepository extends Repository<SupplierContactPerson> {
  constructor(dataSource: DataSource) {
    super(SupplierContactPerson, dataSource.createEntityManager());
  }
}
