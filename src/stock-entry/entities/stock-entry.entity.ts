import { CustomerOffer } from 'src/customer-offer/entities/customer-offer.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SupplierOrderRow } from '../../supplier-order/entities/supplier-order-row.entity';

@Entity({ name: 'stock_entries' })
export class StockEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'stock_entry_date', type: 'date' })
  stockEntryDate: Date;

  @Column({ name: 'supplier_order_row_id' })
  supplierOrderRowId: number;

  @ManyToOne(() => SupplierOrderRow, (sor) => sor.id)
  @JoinColumn({ name: 'supplier_order_row_id' })
  readonly supplierOrderRow?: Readonly<SupplierOrderRow>;

  // @Column({ name: 'customer_offer_id', nullable: true }) // you can have a stock entry associated with an offer (+reservedStock) THIS IS NOT NEEDED BECAUSE YOU XAN TAKE IT FROM supplier order row -> supplier order -> customer offer
  // customerOfferId: number;
  //
  // @ManyToOne(() => CustomerOffer, (customerOffer) => customerOffer.id)
  // @JoinColumn({ name: 'customer_offer_id' })
  // readonly customerOffer?: Readonly<CustomerOffer>;

  @Column({ name: 'shipment_date', type: 'date' })
  shipmentDate: Date;

  @Column()
  awb: string;

  @Column({ default: false })
  shipped: boolean; // only if marked as true the product is considered entered in stock

  @Column()
  quantity: number; // this quantity cannot exceed orderedQuantity from supplier order row

  @Column({ name: 'supplier_invoice_date', type: 'date' })
  supplierInvoiceDate: Date;

  @Column({ name: 'supplier_invoice_number' })
  supplierInvoiceNumber: string;

  @Column({ name: 'dvi_number' })
  dviNumber: string;

  @Column({ name: 'dvi_date', type: 'date' })
  dviDate: Date;

  @Column({ name: 'supplier_currency_to_ron_exchange_rate', type: 'real' })
  supplierCurrencyToRonExchangeRate: number;

  // @Column() // astea sunt serial numbers
  // sns: string;

  @Column()
  destination: string;

  @Column({ name: 'nir_number' })
  nirNumber: string;

  @Column({ name: 'nir_date' })
  nirDate: Date;
}
