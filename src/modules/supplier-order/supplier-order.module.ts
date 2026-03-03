import { Module } from '@nestjs/common';
import { SupplierOrderService } from './supplier-order.service';
import { SupplierOrderPdfService } from './supplier-order-pdf.service';
import { SupplierOrderController } from './supplier-order.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupplierOrder } from './entities/supplier-order.entity';
import { SupplierOrderRow } from './entities/supplier-order-row.entity';
import { StockEntryDelivery } from '../stock-entry/entities/stock-entry-delivery.entity';
import { StockEntry } from '../stock-entry/entities/stock-entry.entity';

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
  providers: [SupplierOrderService, SupplierOrderPdfService],
})
export class SupplierOrderModule {}
