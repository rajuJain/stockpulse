import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';

export enum BillingCycle { MONTHLY = 'monthly', QUARTERLY = 'quarterly', YEARLY = 'yearly' }

@Entity('plans')
export class Plan {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true, unique: true })
  userId: number;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ length: 120 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ name: 'billing_cycle', type: 'enum', enum: BillingCycle, default: BillingCycle.MONTHLY })
  billingCycle: BillingCycle;

  @Column({ name: 'max_subs', type: 'int', default: 100 })
  maxSubs: number;

  @Column({ type: 'json', nullable: true })
  focus: string[] | null;

  @Column({ type: 'json', nullable: true })
  perks: string[] | null;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ name: 'subscriber_count', type: 'int', default: 0 })
  subscriberCount: number;

  @Column({ name: 'total_revenue', type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalRevenue: number;

  @Column({ name: 'razorpay_plan_id', length: 100, nullable: true })
  razorpayPlanId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
