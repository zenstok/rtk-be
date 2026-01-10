import { Module } from '@nestjs/common';
import { SupplierService } from './supplier.service';
import { SupplierController } from './supplier.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Supplier } from './entities/supplier.entity';
import { SupplierContactPerson } from './entities/supplier-contact-person.entity';
import { SupplierOrderDelivery } from '../supplier-order/entities/supplier-order-delivery.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Supplier,
      SupplierContactPerson,
      SupplierOrderDelivery,
    ]),
  ],
  controllers: [SupplierController],
  providers: [SupplierService],
})
export class SupplierModule {}
