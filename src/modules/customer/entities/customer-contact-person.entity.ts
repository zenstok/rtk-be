import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Customer } from './customer.entity';

@Entity({ name: 'customer_contact_persons' })
export class CustomerContactPerson {
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
  customerId: number;

  @ManyToOne(() => Customer, (customer) => customer.id)
  @JoinColumn({ name: 'customer_id' })
  readonly customer?: Readonly<Customer>;
}
