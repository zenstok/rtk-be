import { Module } from '@nestjs/common';
import { SupplierOrderService } from './supplier-order.service';
import { SupplierOrderController } from './supplier-order.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupplierOrder } from './entities/supplier-order.entity';
import { SupplierOrderRow } from './entities/supplier-order-row.entity';
import { StockEntryDelivery } from '../stock-entry/entities/stock-entry-delivery.entity';
import { StockEntry } from '../stock-entry/entities/stock-entry.entity';
import { SupplierOrderRepository } from './repositories/supplier-order.repository';
import { SupplierOrderRowRepository } from './repositories/supplier-order-row.repository';
import { StockEntryDeliveryRepository } from './repositories/stock-entry-delivery.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SupplierOrder,
      SupplierOrderRow,
      StockEntryDelivery,
      StockEntry,
    ]),
  ],
  controllers: [SupplierOrderController],
  providers: [
    SupplierOrderService,
    SupplierOrderRepository,
    SupplierOrderRowRepository,
    StockEntryDeliveryRepository,
  ],
})
export class SupplierOrderModule {}
