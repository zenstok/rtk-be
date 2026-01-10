import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { File } from '../../file/entities/file.entity';
import { SupplierOrderRow } from './supplier-order-row.entity';

// TODO, check with business what fields should belong to stock entry and what fields should belong to supplier order delivery
@Entity({ name: 'supplier_order_deliveries' })
export class SupplierOrderDelivery {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'supplier_order_row_id' })
  supplierOrderRowId: number;

  @ManyToOne(() => SupplierOrderRow, (sor) => sor.id)
  @JoinColumn({ name: 'supplier_order_row_id' })
  readonly supplierOrderRow?: Readonly<SupplierOrderRow>; // supplier order row can have at most the ordered quantity as stock entries (the app should enforce this) .e.g ordered quantity is 3 => there are 3 stock entries associated with it

  @Column({ name: 'quantity' })
  quantity: number; // if supplier order row has orderedQuantity = 5, all associated supplier order deliveries must have the sum of quantity to 5

  @Column()
  awb: string;

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

  @Column({ name: 'estimated_shipment_date', type: 'date' })
  estimatedShipmentDate: Date;

  @Column({ name: 'shipment_date', type: 'date', nullable: true })
  shipmentDate?: Date; // when this is set, it implies stock entry rows are created

  get isShipped() {
    return Boolean(this.shipmentDate);
  }
}
