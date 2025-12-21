import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SuppliersProductCatalog } from '../../suppliers-product-catalog/entities/suppliers-product-catalog.entity';
import { SupplierOrder } from './supplier-order.entity';

@Entity({ name: 'supplier_order_rows' })
export class SupplierOrderRow {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'supplier_order_id' })
  supplierOrderId: number;

  @ManyToOne(() => SupplierOrder, (order) => order.id)
  @JoinColumn({ name: 'supplier_order_id' })
  readonly supplierOrder?: Readonly<SupplierOrder>;

  @Column({ name: 'suppliers_product_catalog_id' })
  suppliersProductCatalogId: number;

  @ManyToOne(() => SuppliersProductCatalog, (spc) => spc.id)
  @JoinColumn({ name: 'suppliers_product_catalog_id' })
  readonly suppliersProductCatalog?: Readonly<SuppliersProductCatalog>;

  @Column({ name: 'unit_price', type: 'real' })
  unitPrice: number;

  @Column({ name: 'ordered_quantity', type: 'real' })
  orderedQuantity: number;
}
