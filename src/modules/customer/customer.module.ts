import { Module } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CustomerController } from './customer.controller';
import { Customer } from './entities/customer.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerContactPerson } from './entities/customer-contact-person.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Customer, CustomerContactPerson])],
  controllers: [CustomerController],
  providers: [CustomerService],
})
export class CustomerModule {}
