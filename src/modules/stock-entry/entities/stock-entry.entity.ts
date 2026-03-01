import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { StockEntryDelivery } from './stock-entry-delivery.entity';
import { CustomerOffer } from '../../customer-offer/entities/customer-offer.entity';

export enum StockEntryOrigin {
  FROM_RESERVED_SUPPLIER_ORDER = 'FROM_RESERVED_SUPPLIER_ORDER',
  FROM_SIMPLE_SUPPLIER_ORDER = 'FROM_SIMPLE_SUPPLIER_ORDER',
}

// origin determines the source of this stock entry:
// - FROM_RESERVED_SUPPLIER_ORDER: customerOfferId is always set at creation time
//   (copied from supplierOrder.customerOfferId). Cannot be unreserved.
// - FROM_SIMPLE_SUPPLIER_ORDER: customerOfferId is initially NULL (free stock).
//   Can be manually reserved to an offer by setting customerOfferId, or unreserved by setting it back to NULL.

@Entity({ name: 'stock_entries' })
export class StockEntry {
  @PrimaryColumn({ name: 'serial_number' })
  serialNumber: string;

  @Column({ name: 'stock_entry_delivery_id' })
  stockEntryDeliveryId: number;

  @ManyToOne(() => StockEntryDelivery, (delivery) => delivery.stockEntries)
  @JoinColumn({ name: 'stock_entry_delivery_id' })
  readonly stockEntryDelivery?: Readonly<StockEntryDelivery>;

  @Column({ type: 'enum', enum: StockEntryOrigin })
  origin: StockEntryOrigin;

  @Column({ name: 'customer_offer_id', nullable: true })
  customerOfferId?: number;

  @ManyToOne(
    () => CustomerOffer,
    (customerOffer) => customerOffer.reservedStockEntries,
  )
  @JoinColumn({ name: 'customer_offer_id' })
  readonly customerOffer?: Readonly<CustomerOffer>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
