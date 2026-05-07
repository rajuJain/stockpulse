import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Plan } from '../plans/plan.entity';

export enum SubscriptionStatus {
  ACTIVE = 'active', CANCELLED = 'cancelled', EXPIRED = 'expired', PAUSED = 'paused',
}

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'subscriber_id', type: 'bigint', unsigned: true })
  subscriberId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subscriber_id' })
  subscriber: User;

  @Column({ name: 'plan_id', type: 'bigint', unsigned: true })
  planId: number;

  @ManyToOne(() => Plan, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan: Plan;

  @Column({ name: 'analyst_id', type: 'bigint', unsigned: true })
  analystId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'analyst_id' })
  analyst: User;

  @Column({ type: 'enum', enum: SubscriptionStatus, default: SubscriptionStatus.ACTIVE })
  status: SubscriptionStatus;

  @CreateDateColumn({ name: 'started_at' })
  startedAt: Date;

  @Column({ name: 'current_end', type: 'datetime' })
  currentEnd: Date;

  @Column({ name: 'cancelled_at', type: 'datetime', nullable: true })
  cancelledAt: Date | null;

  @Column({ name: 'razorpay_sub_id', length: 100, nullable: true })
  razorpaySubId: string | null;
}
