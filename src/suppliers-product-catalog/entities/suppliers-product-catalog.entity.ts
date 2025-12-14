import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Supplier } from '../../supplier/entities/supplier.entity';
import { Product } from 'src/product/entities/product.entity';

@Entity({ name: 'suppliers_product_catalog' })
@Unique(['supplierId', 'productId'])
export class SuppliersProductCatalog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'supplier_id' })
  supplierId: number;

  @ManyToOne(() => Supplier)
  @JoinColumn({ name: 'supplier_id' })
  readonly supplier?: Readonly<Supplier>;

  @Column({ name: 'product_id' })
  productId: number;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  readonly product?: Readonly<Product>;

  @Column({ name: 'supplier_code' })
  supplierCode: string;

  @Column({
    name: 'tariff_rate',
    type: 'real',
    nullable: true,
  })
  tariffRate: number; // this is the template value which is prefilled in price analysis if value is not null

  @Column({ name: 'observations', nullable: true })
  observations: string;
}
