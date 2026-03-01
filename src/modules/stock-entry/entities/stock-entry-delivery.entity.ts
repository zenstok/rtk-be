import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SupplierOrderRow } from '../../supplier-order/entities/supplier-order-row.entity';
import { File } from '../../file/entities/file.entity';
import { StockEntry } from './stock-entry.entity';

@Entity({ name: 'stock_entry_deliveries' })
export class StockEntryDelivery {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'estimated_shipment_date', type: 'date' })
  estimatedShipmentDate: Date;

  @Column({ name: 'shipment_date', type: 'date', nullable: true })
  shipmentDate?: Date; // when this is set, it implies stock entries are created

  @Column({ name: 'supplier_order_row_id' })
  supplierOrderRowId: number;

  @ManyToOne(() => SupplierOrderRow, (sor) => sor.stockEntryDeliveries)
  @JoinColumn({ name: 'supplier_order_row_id' })
  readonly supplierOrderRow?: Readonly<SupplierOrderRow>;

  @Column({ name: 'quantity' })
  quantity: number; // sum of quantities across all deliveries for a supplier order row must equal orderedQuantity

  @Column({ nullable: true })
  awb?: string;

  @Column({ name: 'warranty_file_id', nullable: true })
  warrantyFileId?: number;

  @ManyToOne(() => File, (file) => file.id)
  @JoinColumn({ name: 'warranty_file_id' })
  readonly warrantyFile?: Readonly<File>;

  @Column({ name: 'handover_file_id', nullable: true })
  handoverFileId?: number;

  @ManyToOne(() => File, (file) => file.id)
  @JoinColumn({ name: 'handover_file_id' })
  readonly handoverFile?: Readonly<File>;

  @Column({ name: 'dvi_number', nullable: true })
  dviNumber?: string;

  @Column({ name: 'dvi_date', type: 'date', nullable: true })
  dviDate?: Date;

  @Column({ name: 'nir_number', nullable: true })
  nirNumber?: string;

  @Column({ name: 'nir_date', nullable: true })
  nirDate?: Date;

  @Column({ name: 'supplier_invoice_date', type: 'date', nullable: true })
  supplierInvoiceDate?: Date;

  @Column({ name: 'supplier_invoice_number', nullable: true })
  supplierInvoiceNumber?: string;

  @Column({
    name: 'supplier_currency_to_ron_exchange_rate',
    type: 'real',
    nullable: true,
  })
  supplierCurrencyToRonExchangeRate?: number;

  isShipped() {
    return Boolean(this.shipmentDate);
  }

  @OneToMany(() => StockEntry, (stockEntry) => stockEntry.stockEntryDelivery)
  stockEntries: StockEntry[];
}
