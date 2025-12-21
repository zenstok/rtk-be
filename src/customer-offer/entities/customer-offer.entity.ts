import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Customer } from 'src/customer/entities/customer.entity';
import { PriceAnalysis } from 'src/price-analysis/entities/price-analysis.entity';
import { File } from '../../file/entities/file.entity';
import { StockEntry } from '../../stock-entry/entities/stock-entry.entity';

export enum CustomerOfferStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  FINALIZED = 'FINALIZED',
  SENT_TO_CUSTOMER = 'SENT_TO_CUSTOMER',
  RECEIVED_CUSTOMER_ORDER = 'RECEIVED_CUSTOMER_ORDER',
  CONFIRMED_CUSTOMER_ORDER = 'CONFIRMED_CUSTOMER_ORDER',
  CANCELED = 'CANCELED',
}

@Entity({ name: 'customer_offers' })
export class CustomerOffer {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column()
  @Column({ type: 'enum', enum: CustomerOfferStatus })
  status: CustomerOfferStatus;

  @Column({ name: 'confirmed_customer_order_number', nullable: true })
  confirmedCustomerOrderNumber: string;

  @Column({ name: 'close_date', type: 'date', nullable: true }) // will be changed automatically to the moment of RECEIVED_CUSTOMER_ORDER
  closeDate: Date;

  @Column({ name: 'close_probability', default: 0 })
  closeProbability: number;

  @Column({ name: 'price_analysis_id' })
  priceAnalysisId: number;

  @ManyToOne(() => PriceAnalysis, (priceAnalysis) => priceAnalysis.id)
  @JoinColumn({ name: 'price_analysis_id' })
  readonly priceAnalysis?: Readonly<PriceAnalysis>;

  @Column({ name: 'customer_id' })
  customerId: number;

  @ManyToOne(() => Customer, (customer) => customer.id)
  @JoinColumn({ name: 'customer_id' })
  readonly customer?: Readonly<Customer>;

  @Column({ name: 'customer_order_file_id' })
  customerOrderFileId: number;

  @ManyToOne(() => File, (file) => file.id)
  @JoinColumn({ name: 'customer_order_file_id' })
  readonly customerOrderFile?: Readonly<File>;

  @OneToMany(() => StockEntry, (stockEntry) => stockEntry.id)
  readonly reservedStockEntries?: Readonly<StockEntry>; // (cand faci o comanda furnizor si alegi ca rezervi din stoc 3/5 produse, sistemul te oblica sa alegi SN-urile produselor pe care le rezervi si dupa in view one oferta sa poti sa faci iesiri stoc ptr aceste SN-uri)
}
