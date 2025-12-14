import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SupplierOrder } from '../../supplier-order/entities/supplier-order.entity';
import { CustomerOffer } from '../../customer-offer/entities/customer-offer.entity';
import { Customer } from '../../customer/entities/customer.entity';

@Entity({ name: 'stock_exits' })
export class StockExit {
  @PrimaryGeneratedColumn()
  id: number;
  //
  // @Column({ name: 'supplier_order_id' })
  // supplierOrderId: number;
  //
  // @ManyToOne(() => SupplierOrder, (supplierOrder) => supplierOrder.id)
  // @JoinColumn({ name: 'supplier_order_id' })
  // readonly supplierOrder?: Readonly<SupplierOrder>;

  // poti face iesire stoc doar din ecranul unei comenzi furnizor
  @Column({ name: 'customer_offer_id', nullable: true }) // you can have a stock entry associated with an offer (-reservedStock)
  customerOfferId: number;

  @ManyToOne(() => CustomerOffer, (customerOffer) => customerOffer.id)
  @JoinColumn({ name: 'customer_offer_id' })
  readonly customerOffer?: Readonly<CustomerOffer>;

  @Column({ name: 'customer_id' })
  customerId: number;

  @ManyToOne(() => Customer, (customer) => customer.id)
  @JoinColumn({ name: 'customer_id' })
  readonly customer?: Readonly<Customer>;

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

  @Column({ name: 'product_serial_number' })
  productSerialNumber: string;

  @Column({ name: 'product_localization' })
  productLocalization: string; // la rtk/la client/nespecificat (Se fac statistici sa vezi cate sunt la rtk, cate la client etc)

  @Column({ name: 'observations' })
  observations: string;

  @Column({ name: 'declaration_of_conformity_number' })
  declarationOfConformityNumber: string;

  @Column({ name: 'declaration_of_conformity_date' })
  declarationOfConformityDate: Date;

  @Column({ name: 'handover_reception_report_number' })
  handoverReceptionReportNumber: string;

  @Column({ name: 'handover_reception_report_date' })
  handoverReceptionReportDate: Date;

  @Column({ name: 'warranty_quality_certificate_number' })
  warrantyQualityCertificateNumber: string;

  @Column({ name: 'warranty_quality_certificate_date' })
  warrantyQualityCertificateDate: Date;

  @Column({ name: 'warranty_status' })
  warrantyStatus: string; // 'Under Warranty' | 'Post-Warranty'

  @Column({ name: 'warranty_expiration_date' })
  warrantyExpirationDate: Date;

  @Column({ name: 'physically_delivered' })
  physicallyDelivered: boolean;

  @Column({ name: 'custody_report_number', nullable: true })
  custodyReportNumber: string;

  @Column({ name: 'custody_report_date', nullable: true })
  custodyReportDate: Date;
}
