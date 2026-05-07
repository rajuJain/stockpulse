import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';

export enum TipType { DAILY = 'daily', SWING = 'swing', LONGTERM = 'longterm' }
export enum Sentiment { BULL = 'bull', BEAR = 'bear', NEUTRAL = 'neutral' }
export enum TipStatus { OPEN = 'open', TARGET_HIT = 'target_hit', SL_HIT = 'sl_hit', EXPIRED = 'expired' }
export enum TipResult { WIN = 'win', LOSS = 'loss' }

@Entity('tips')
export class Tip {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ length: 20 })
  ticker: string;

  @Column({ name: 'tip_type', type: 'enum', enum: TipType })
  tipType: TipType;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  entry: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  target: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  sl: number | null;

  @Column({ length: 10 })
  horizon: string;

  @Column({ type: 'enum', enum: Sentiment })
  sentiment: Sentiment;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ name: 'is_paid', type: 'boolean', default: false })
  isPaid: boolean;

  @Column({ type: 'enum', enum: TipStatus, default: TipStatus.OPEN })
  status: TipStatus;

  @Column({ type: 'enum', enum: TipResult, nullable: true })
  result: TipResult | null;

  @Column({ name: 'exit_price', type: 'decimal', precision: 12, scale: 2, nullable: true })
  exitPrice: number | null;

  @Column({ name: 'resolved_at', type: 'datetime', nullable: true })
  resolvedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /** Computed risk-reward ratio */
  get riskReward(): number | null {
    if (!this.entry || !this.sl || this.entry === this.sl) return null;
    return Math.abs((this.target - this.entry) / (this.entry - this.sl));
  }

  /** Return % when resolved */
  get returnPct(): number | null {
    if (!this.exitPrice || !this.entry) return null;
    return ((this.exitPrice - this.entry) / this.entry) * 100;
  }
}
