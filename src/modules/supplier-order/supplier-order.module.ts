import { Module } from '@nestjs/common';
import { SupplierOrderService } from './supplier-order.service';
import { SupplierOrderController } from './supplier-order.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupplierOrder } from './entities/supplier-order.entity';
import { SupplierOrderRow } from './entities/supplier-order-row.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SupplierOrder, SupplierOrderRow])],
  controllers: [SupplierOrderController],
  providers: [SupplierOrderService],
})
export class SupplierOrderModule {}
