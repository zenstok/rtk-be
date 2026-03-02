import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { CustomerContactPerson } from '../entities/customer-contact-person.entity';

@Injectable()
export class CustomerContactPersonRepository extends Repository<CustomerContactPerson> {
  constructor(dataSource: DataSource) {
    super(CustomerContactPerson, dataSource.createEntityManager());
  }
}
