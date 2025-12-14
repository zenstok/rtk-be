import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'customers' })
export class Customer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  address: string;

  @Column({ name: 'unique_registration_code', unique: true })
  uniqueRegistrationCode: string;

  @Column({ name: 'trade_register_number', unique: true })
  tradeRegisterNumber: string;

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

  @Column()
  domain: string;

  @Column({ nullable: true })
  euid: string;

  @Column({ nullable: true })
  bank: string;

  @Column({ nullable: true })
  iban: string;

  @Column({ nullable: true })
  bic: string;
}
