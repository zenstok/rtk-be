import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PriceAnalysisSupplierGroup } from './price-analysis-supplier-group.entity';
import { SuppliersProductCatalog } from '../../suppliers-product-catalog/entities/suppliers-product-catalog.entity';

@Entity({ name: 'price_analysis_rows' })
export class PriceAnalysisRow {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'price_analysis_supplier_group_id' })
  priceAnalysisSupplierGroupId: number;

  @ManyToOne(() => PriceAnalysisSupplierGroup, (pasg) => pasg.id)
  @JoinColumn({ name: 'price_analysis_supplier_group_id' })
  readonly priceAnalysisSupplierGroup?: Readonly<PriceAnalysisSupplierGroup>;

  @Column({ name: 'suppliers_product_catalog_id' })
  suppliersProductCatalogId: number;

  @ManyToOne(() => SuppliersProductCatalog, (spc) => spc.id)
  @JoinColumn({ name: 'suppliers_product_catalog_id' })
  readonly suppliersProductCatalog?: Readonly<SuppliersProductCatalog>;

  @Column({ name: 'unit_price', type: 'real' })
  unitPrice: number;

  @Column({ type: 'real' })
  quantity: number;

  @Column({ name: 'product_discount', type: 'real' })
  productDiscount: number;

  @Column({ name: 'customer_discount', type: 'real' })
  customerDiscount: number;

  @Column({
    name: 'tariff_rate',
    type: 'real',
    nullable: true,
  })
  tariffRate: number;
}
