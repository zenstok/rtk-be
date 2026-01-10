import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'bnr_api_history' })
export class BnrApiHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'publishing_date', unique: true })
  publishingDate: string;

  @Column({ name: 'eur_to_ron_exchange_rate', type: 'real' })
  eurToRonExchangeRate: number;

  @Column({ name: 'usd_to_ron_exchange_rate', type: 'real' })
  usdToRonExchangeRate: number;

  @Column({ name: 'gbp_to_ron_exchange_rate', type: 'real' })
  gbpToRonExchangeRate: number;
}
