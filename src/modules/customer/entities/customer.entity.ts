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
