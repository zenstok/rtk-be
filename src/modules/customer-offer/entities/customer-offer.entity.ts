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
import { Customer } from 'src/modules/customer/entities/customer.entity';
import { PriceAnalysis } from 'src/modules/price-analysis/entities/price-analysis.entity';
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

  @Column({
    type: 'enum',
    enum: CustomerOfferStatus,
    default: CustomerOfferStatus.IN_PROGRESS,
  })
  status: CustomerOfferStatus;

  @Column({ name: 'confirmed_customer_order_receiving_method', nullable: true })
  customerOrderReceivingMethod?: string; // PO standard Client/PO standard RTK/Email/Verbal

  @Column({ name: 'confirmed_customer_order_number', nullable: true })
  customerOrderNumber?: string;

  @Column({ name: 'close_date', type: 'date', nullable: true }) // will be changed automatically to the moment of RECEIVED_CUSTOMER_ORDER
  closeDate?: Date;

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

  @Column({ name: 'customer_order_file_id', nullable: true })
  customerOrderFileId?: string;

  @ManyToOne(() => File, (file) => file.id)
  @JoinColumn({ name: 'customer_order_file_id' })
  readonly customerOrderFile?: Readonly<File>;

  @OneToMany(() => StockEntry, (stockEntry) => stockEntry.customerOffer)
  readonly reservedStockEntries?: Readonly<StockEntry[]>;
}
