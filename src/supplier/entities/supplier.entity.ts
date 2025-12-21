import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SupplierContactPerson } from './supplier-contact-person.entity';

@Entity({ name: 'suppliers' })
export class Supplier {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  address: string;

  @Column()
  country: string;

  @Column({ name: 'fiscal_code', unique: true })
  fiscalCode: string;

  @Column({ name: 'unique_registration_code', unique: true })
  uniqueRegistrationCode: string;

  @Column()
  currency: string;

  @Column({ name: 'pick_up_address' })
  pickUpAddress: string;

  @Column({ name: 'supplier_contact_person_id' })
  pickupContactPersonId: number;

  @ManyToOne(() => SupplierContactPerson, (person) => person.id)
  @JoinColumn({ name: 'supplier_contact_person_id' })
  readonly pickupContactPerson?: Readonly<SupplierContactPerson>;
}
