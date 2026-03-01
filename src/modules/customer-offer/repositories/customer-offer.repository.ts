import { DataSource, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { CustomerOffer } from '../entities/customer-offer.entity';
import {
  StockEntry,
  StockEntryOrigin,
} from '../../stock-entry/entities/stock-entry.entity';
import { StockEntryDelivery } from '../../stock-entry/entities/stock-entry-delivery.entity';
import { SupplierOrderRow } from '../../supplier-order/entities/supplier-order-row.entity';
import { StockExit } from '../../stock-exit/entities/stock-exit.entity';

@Injectable()
export class CustomerOfferRepository extends Repository<CustomerOffer> {
  constructor(dataSource: DataSource) {
    super(CustomerOffer, dataSource.createEntityManager());
  }

  async findUnreservedStockEntries(
    suppliersProductCatalogId: number,
  ): Promise<StockEntry[]> {
    return this.manager
      .createQueryBuilder(StockEntry, 'se')
      .innerJoin(
        StockEntryDelivery,
        'sed',
        'sed.id = se.stock_entry_delivery_id',
      )
      .innerJoin(SupplierOrderRow, 'sor', 'sor.id = sed.supplier_order_row_id')
      .leftJoin(
        StockExit,
        'sx',
        'sx.stock_entry_serial_number = se.serial_number',
      )
      .where('sor.suppliers_product_catalog_id = :suppliersProductCatalogId', {
        suppliersProductCatalogId,
      })
      .andWhere('se.origin = :origin', {
        origin: StockEntryOrigin.FROM_SIMPLE_SUPPLIER_ORDER,
      })
      .andWhere('se.customer_offer_id IS NULL')
      .andWhere('sx.id IS NULL')
      .getMany();
  }
}
