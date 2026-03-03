import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Customer } from '../../customer/entities/customer.entity';
import { StockEntry } from '../../stock-entry/entities/stock-entry.entity';
import { CustomerOffer } from '../../customer-offer/entities/customer-offer.entity';

export enum StockExitSource {
  DIRECT_SALE = 'DIRECT_SALE',
  FROM_OFFER_RESERVATION = 'FROM_OFFER_RESERVATION',
  FROM_RESERVED_SUPPLIER_ORDER = 'FROM_RESERVED_SUPPLIER_ORDER',
}

// source determines how the customer was resolved:
// - DIRECT_SALE: free stock sold from product screen, customer provided directly at exit creation
// - FROM_OFFER_RESERVATION: stock entry was manually reserved to an offer (stockEntry.customerOfferId was set on demand)
// - FROM_RESERVED_SUPPLIER_ORDER: stock entry came from a reserved supplier order (stockEntry.origin = FROM_RESERVED_SUPPLIER_ORDER)
// In all cases, customerId is always resolved and stored at creation time for easy querying.
@Entity({ name: 'stock_exits' })
export class StockExit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'stock_entry_serial_number' })
  stockEntrySerialNumber: string;

  @OneToOne(() => StockEntry, { eager: false })
  @JoinColumn({
    name: 'stock_entry_serial_number',
    referencedColumnName: 'serialNumber',
  })
  readonly stockEntry?: Readonly<StockEntry>;

  @Column({ type: 'enum', enum: StockExitSource })
  source: StockExitSource;

  @Column({ name: 'customer_id' })
  customerId: number; // always resolved at creation time, regardless of source

  @ManyToOne(() => Customer, (customer) => customer.id)
  @JoinColumn({ name: 'customer_id' })
  readonly customer?: Readonly<Customer>;

  @Column({ name: 'customer_offer_id', nullable: true })
  customerOfferId: number; // always resolved at creation time, regardless of source

  @ManyToOne(() => CustomerOffer, (offer) => offer.id)
  @JoinColumn({ name: 'customer_offer_id' })
  readonly customerOffer?: Readonly<CustomerOffer>;

  @Column({ name: 'invoice_date', type: 'date' })
  invoiceDate: Date;

  @Column({ name: 'invoice_number' })
  invoiceNumber: string;

  @Column({ name: 'exit_price_ron', type: 'real' }) // daca e o analiza de produse in spate se preia din ea
  exitPriceRon: number;

  @Column({ name: 'exit_price_eur', type: 'real' }) // daca e o analiza de produse in spate se preia din ea
  exitPriceEur: number;

  @Column({ name: 'source_country' })
  sourceCountry: string;

  @Column({ name: 'destination_country' })
  destinationCountry: string;

  @Column({ name: 'product_localization' })
  productLocalization: string; // la rtk/la client/nespecificat (Se fac statistici sa vezi cate sunt la rtk, cate la client etc)

  @Column({ name: 'observations', nullable: true })
  observations: string;

  @Column({ name: 'declaration_of_conformity_number', nullable: true })
  declarationOfConformityNumber: string;

  @Column({ name: 'declaration_of_conformity_date', nullable: true })
  declarationOfConformityDate: Date;

  @Column({ name: 'handover_reception_report_number', nullable: true })
  handoverReceptionReportNumber: string;

  @Column({ name: 'handover_reception_report_date', nullable: true })
  handoverReceptionReportDate: Date;

  @Column({ name: 'warranty_quality_certificate_number', nullable: true })
  warrantyQualityCertificateNumber: string;

  @Column({ name: 'warranty_quality_certificate_date', nullable: true })
  warrantyQualityCertificateDate: Date;

  @Column({ name: 'warranty_status', nullable: true })
  warrantyStatus: string; // 'Under Warranty' | 'Post-Warranty'

  @Column({ name: 'warranty_expiration_date', nullable: true })
  warrantyExpirationDate: Date;

  @Column({ name: 'physically_delivered', nullable: true, default: false })
  physicallyDelivered: boolean;

  @Column({ name: 'custody_report_number', nullable: true })
  custodyReportNumber: string;

  @Column({ name: 'custody_report_date', nullable: true })
  custodyReportDate: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
