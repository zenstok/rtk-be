import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Supplier } from './supplier.entity';

@Entity({ name: 'supplier_contact_persons' })
export class SupplierContactPerson {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'contact_person_first_name' })
  firstName: string;

  @Column({ name: 'contact_person_last_name' })
  lastName: string;

  @Column({ name: 'contact_person_position' })
  position: string;

  @Column({ name: 'contact_person_email' })
  email: string;

  @Column({ name: 'contact_person_phone' })
  phone: string;

  @Column({ name: 'customer_id' })
  supplierId: number;

  @ManyToOne(() => Supplier, (supplier) => supplier.id)
  @JoinColumn({ name: 'supplier_id' })
  readonly customer?: Readonly<Supplier>;
}
