import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'products' })
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ default: '' })
  description: string;

  @Column()
  category: string;

  @Column()
  manufacturer: string;

  @Column({ name: 'manufacturer_code' })
  manufacturerCode: string;

  @Column({ name: 'hs_code', default: '' })
  hsCode: string;

  @Column({ name: 'taric_code', default: '' })
  taricCode: string;

  @Column({ name: 'unit_of_measurement' })
  unitOfMeasurement: string;

  stock: number;
  reservedStock: number;
}
