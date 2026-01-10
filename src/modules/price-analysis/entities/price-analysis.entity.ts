import { ProductProcurementRequest } from 'src/modules/product-procurement-request/entities/product-procurement-request.entity';
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
import { PriceAnalysisSupplierGroup } from './price-analysis-supplier-group.entity';

@Entity({ name: 'price_analyses' })
export class PriceAnalysis {
  @PrimaryGeneratedColumn()
  id: number;

  // sincer astea sunt chestii pe care le tot vede pe parcurs si adauga complexitate, inseamna 2 campuri noi si in frontend
  // @Column({ name: 'ron_customer_budget', type: 'real' })
  // ronCustomerBudget: number;
  //
  // get eurCustomerBudget(): number {
  //   return this.ronCustomerBudget / this.eurToRonExchangeRate;
  // }

  @Column({ name: 'project_discount', type: 'real', default: 0 })
  projectDiscount: number;

  @Column({ name: 'vat_rate', type: 'real', default: 21 })
  vatRate: number;

  // campul factor conversie valutara este dedus din care e moneda furnizorului si e calculata cu valorile de aici
  @Column({ name: 'eur_to_ron_exchange_rate', type: 'real' })
  eurToRonExchangeRate: number;

  @Column({ name: 'usd_to_ron_exchange_rate', type: 'real' })
  usdToRonExchangeRate: number;

  @Column({ name: 'gbp_to_ron_exchange_rate', type: 'real' })
  gbpToRonExchangeRate: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'product_procurement_request_id' })
  productProcurementRequestId: number;

  @ManyToOne(() => ProductProcurementRequest, (request) => request.id)
  @JoinColumn({ name: 'product_procurement_request_id' })
  readonly productProcurementRequest?: Readonly<ProductProcurementRequest>;

  @OneToMany(() => PriceAnalysisSupplierGroup, (group) => group.id)
  priceAnalysisSupplierGroups: PriceAnalysisSupplierGroup[];
}
