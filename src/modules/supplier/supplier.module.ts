import { Module } from '@nestjs/common';
import { SupplierService } from './supplier.service';
import { SupplierController } from './supplier.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Supplier } from './entities/supplier.entity';
import { SupplierContactPerson } from './entities/supplier-contact-person.entity';
import { SupplierRepository } from './repositories/supplier.repository';
import { SupplierContactPersonRepository } from './repositories/supplier-contact-person.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Supplier, SupplierContactPerson])],
  controllers: [SupplierController],
  providers: [
    SupplierService,
    SupplierRepository,
    SupplierContactPersonRepository,
  ],
})
export class SupplierModule {}
