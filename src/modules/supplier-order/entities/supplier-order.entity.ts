import { CustomerOffer } from 'src/modules/customer-offer/entities/customer-offer.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Supplier } from '../../supplier/entities/supplier.entity';
import { User } from '../../user/entities/user.entity';

export enum SupplierOrderStatus {
  CREATED = 'CREATED',
  VALIDATED = 'VALIDATED',
  SENT_TO_SUPPLIER = 'SENT_TO_SUPPLIER',
  IN_DELIVERY = 'IN_DELIVERY',
  DELIVERED = 'DELIVERED',
  CANCELED = 'CANCELED',
}

@Entity({ name: 'supplier_orders' })
export class SupplierOrder {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: SupplierOrderStatus })
  status: SupplierOrderStatus;

  @Column({ name: 'supplier_order_registration_number' })
  supplierOrderRegistrationNumber: string;

  @Column({ name: 'order_acknowledgment_number' })
  orderAcknowledgmentNumber: string;

  @Column({ name: 'order_acknowledgement_date', type: 'date' })
  orderAcknowledgmentDate: Date;

  @Column({
    name: 'customer_commited_delivery_date',
    type: 'date',
    nullable: true,
  })
  customerCommittedDeliveryDate: Date;

  @Column({ name: 'estimated_delivery_date', type: 'date', nullable: true })
  estimatedDeliveryDate: Date;

  get isOverdueDelivery() {
    if (!this.customerCommittedDeliveryDate) return false;

    return this.customerCommittedDeliveryDate < new Date(); // make sure you compare with current date considering Bucharest timezone
  }

  @Column({ name: 'end_user' })
  endUser: string;

  @Column({ name: 'partial_shipment' })
  partialShipment: boolean;

  @Column({ name: 'incoterm_2010' })
  incoterm2010: string;

  @Column({ name: 'mean_of_shipment' })
  meanOfShipment: string;

  @Column({ name: 'our_forwarding_agent', nullable: true })
  ourForwardingAgent: string;

  @Column({ name: 'user_in_charge_id' })
  userInChargeId: number;

  @ManyToOne(() => User, (user) => user.id)
  @JoinColumn({ name: 'user_in_charge_id' })
  readonly userInCharge?: Readonly<User>;

  @Column({ name: 'requested_delivery_date' })
  requestedDeliveryDate: string;

  @Column()
  remarks: string;

  @Column({ name: 'terms_and_mean_of_payment' })
  termsAndMeanOfPayment: string;

  @Column({ name: 'point_of_sales' })
  pointOfSales: string;

  @Column({ name: 'other_instructions' })
  otherInstructions: string;

  @Column({ name: 'customer_offer_id', nullable: true })
  customerOfferId: number;

  @Column({ name: 'order_reference', nullable: true }) // if null, it came from an offer
  orderReference: string;

  @Column({ name: 'manual_creation_reason', nullable: true }) // if null, it came from an offer
  manualCreationReason: string;

  @Column({ name: 'transportation_cost', type: 'real' }) // if null, it came from an offer
  transportationCost: number;

  @ManyToOne(() => CustomerOffer, (customerOffer) => customerOffer.id)
  @JoinColumn({ name: 'customer_offer_id' })
  readonly customerOffer?: Readonly<CustomerOffer>;

  @Column({ name: 'supplier_id' })
  supplierId: number;

  @ManyToOne(() => Supplier, (supplier) => supplier.id)
  @JoinColumn({ name: 'supplier_id' })
  readonly supplier?: Readonly<Supplier>;

  @Column({ name: 'assigned_user_id' })
  assignedUserId: number;

  @ManyToOne(() => User, (user) => user.id)
  @JoinColumn({ name: 'assigned_user_id' })
  readonly assignedUser?: Readonly<User>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
