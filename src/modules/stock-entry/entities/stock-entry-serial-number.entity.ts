import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { StockEntry } from './stock-entry.entity';

@Entity({ name: 'stock_entry_serial_numbers' })
export class StockEntrySerialNumber {
  @PrimaryColumn({ name: 'serial_number' })
  serialNumber: string;

  @ManyToOne(() => StockEntry, (stockEntry) => stockEntry.id)
  @JoinColumn({ name: 'stock_entry_id' })
  readonly stockEntry?: Readonly<StockEntry>;
}
