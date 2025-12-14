import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

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

  @Column({ name: 'contact_person_first_name' })
  contactPersonFirstName: string;

  @Column({ name: 'contact_person_last_name' })
  contactPersonLastName: string;

  @Column({ name: 'contact_person_position' })
  contactPersonPosition: string;

  @Column({ name: 'contact_person_email' })
  contactPersonEmail: string;

  @Column({ name: 'contact_person_phone' })
  contactPersonPhone: string;

  @Column({ name: 'pick_up_address' })
  pickUpAddress: string;

  @Column({ name: 'pick_up_contact_person_first_name' })
  pickUpContactPersonFirstName: string;

  @Column({ name: 'pick_up_contact_person_last_name' })
  pickUpContactPersonLastName: string;

  @Column({ name: 'pick_up_contact_person_position' })
  pickUpContactPersonPosition: string;

  @Column({ name: 'pick_up_contact_person_email' })
  pickUpContactPersonEmail: string;

  @Column({ name: 'pick_up_contact_person_phone' })
  pickUpContactPersonPhone: string;
}
