import { Module } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CustomerController } from './customer.controller';
import { Customer } from './entities/customer.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerContactPerson } from './entities/customer-contact-person.entity';
import { CustomerRepository } from './repositories/customer.repository';
import { CustomerContactPersonRepository } from './repositories/customer-contact-person.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Customer, CustomerContactPerson])],
  controllers: [CustomerController],
  providers: [
    CustomerService,
    CustomerRepository,
    CustomerContactPersonRepository,
  ],
})
export class CustomerModule {}
