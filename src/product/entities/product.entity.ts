import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'products' })
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  description: string;

  @Column()
  category: string; // can be a separate table in the future

  @Column()
  manufacturer: string; // can be a separate table in the future

  @Column({ name: 'manufacturer_code' })
  manufacturerCode: string;

  @Column({ name: 'hs_code' })
  hsCode: string;

  @Column({ name: 'taric_code' })
  taricCode: string;

  @Column({ name: 'unit_of_measurement' })
  unitOfMeasurement: string; // can be a separate table in the future (bucati/set/kit/sistem/m/mp)

  @Column()
  stock: number;

  @Column({ name: 'reserved_stock' })
  reservedStock: number;

  get freeStock() {
    return this.stock - this.reservedStock;
  }
}
