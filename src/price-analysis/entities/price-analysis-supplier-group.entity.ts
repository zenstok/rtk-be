import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PriceAnalysis } from './price-analysis.entity';
import { Supplier } from '../../supplier/entities/supplier.entity';
import { PriceAnalysisRow } from './price-analysis-row.entity';

@Entity({ name: 'price_analysis_supplier_groups' })
export class PriceAnalysisSupplierGroup {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'price_analysis_id' })
  priceAnalysisId: number;

  @ManyToOne(() => PriceAnalysis, (pa) => pa.id)
  @JoinColumn({ name: 'price_analysis_id' })
  readonly priceAnalysis?: Readonly<PriceAnalysis>;

  @Column({ name: 'supplier_id' })
  supplierId: number;

  @ManyToOne(() => Supplier, (supplier) => supplier.id)
  @JoinColumn({ name: 'supplier_id' })
  readonly supplier?: Readonly<Supplier>;

  @Column({ name: 'transportation_cost', type: 'real' })
  transportationCost: number;

  @Column({ name: 'import_export_cost', type: 'real' })
  importExportCost: number;

  @Column({ name: 'financial_cost', type: 'real' })
  financialCost: number;

  @OneToMany(() => PriceAnalysisRow, (row) => row.id)
  priceAnalysisRows: PriceAnalysisRow[];
}
