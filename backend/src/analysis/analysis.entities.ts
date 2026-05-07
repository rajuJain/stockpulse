import { Entity, PrimaryColumn, Column, UpdateDateColumn, OneToOne, JoinColumn, PrimaryGeneratedColumn } from 'typeorm';

@Entity('stocks')
export class Stock {
  @PrimaryColumn({ length: 20 })
  ticker: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 100, nullable: true })
  sector: string | null;

  @Column({ length: 100, nullable: true })
  industry: string | null;

  @Column({ length: 10, default: 'NSE' })
  exchange: string;

  @Column({ name: 'is_index', type: 'boolean', default: false })
  isIndex: boolean;

  @Column({ name: 'current_price', type: 'decimal', precision: 12, scale: 2, nullable: true })
  currentPrice: number | null;

  @Column({ name: 'day_change_pct', type: 'decimal', precision: 6, scale: 2, nullable: true })
  dayChangePct: number | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity('stock_prices')
export class StockPrice {
  @PrimaryColumn({ length: 20 })
  ticker: string;

  @PrimaryColumn({ type: 'date' })
  date: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  open: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  high: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  low: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  close: number;

  @Column({ type: 'bigint' })
  volume: number;
}

@Entity('fundamentals')
export class Fundamental {
  @PrimaryColumn({ length: 20 })
  ticker: string;

  @Column({ name: 'market_cap', length: 30, nullable: true })
  marketCap: string | null;

  @Column({ name: 'pe_ratio', type: 'decimal', precision: 8, scale: 2, nullable: true })
  peRatio: number | null;

  @Column({ name: 'pb_ratio', type: 'decimal', precision: 8, scale: 2, nullable: true })
  pbRatio: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  eps: number | null;

  @Column({ name: 'book_value', type: 'decimal', precision: 10, scale: 2, nullable: true })
  bookValue: number | null;

  @Column({ name: 'debt_to_equity', type: 'decimal', precision: 6, scale: 2, nullable: true })
  debtToEquity: number | null;

  @Column({ name: 'current_ratio', type: 'decimal', precision: 6, scale: 2, nullable: true })
  currentRatio: number | null;

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  roe: number | null;

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  roce: number | null;

  @Column({ name: 'dividend_yield', type: 'decimal', precision: 5, scale: 2, nullable: true })
  dividendYield: number | null;

  @Column({ name: 'face_value', type: 'decimal', precision: 6, scale: 2, nullable: true })
  faceValue: number | null;

  @Column({ name: 'week_52_high', type: 'decimal', precision: 12, scale: 2, nullable: true })
  week52High: number | null;

  @Column({ name: 'week_52_low', type: 'decimal', precision: 12, scale: 2, nullable: true })
  week52Low: number | null;

  @Column({ length: 30, nullable: true })
  revenue: string | null;

  @Column({ name: 'net_profit', length: 30, nullable: true })
  netProfit: string | null;

  @Column({ length: 30, nullable: true })
  ebitda: string | null;

  @Column({ name: 'ebitda_margin', length: 20, nullable: true })
  ebitdaMargin: string | null;

  @Column({ name: 'net_profit_margin', length: 20, nullable: true })
  netProfitMargin: string | null;

  @Column({ name: 'analyst_target', type: 'decimal', precision: 12, scale: 2, nullable: true })
  analystTarget: number | null;

  @Column({ type: 'enum', enum: ['BUY','HOLD','SELL','NEUTRAL'], nullable: true })
  rating: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'raw_data', type: 'json', nullable: true })
  rawData: any;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity('shareholding')
export class Shareholding {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ length: 20 })
  ticker: string;

  @Column({ length: 10 })
  quarter: string;

  @Column({ name: 'promoter_pct', type: 'decimal', precision: 5, scale: 2 })
  promoterPct: number;

  @Column({ name: 'fii_pct', type: 'decimal', precision: 5, scale: 2 })
  fiiPct: number;

  @Column({ name: 'dii_pct', type: 'decimal', precision: 5, scale: 2 })
  diiPct: number;

  @Column({ name: 'public_pct', type: 'decimal', precision: 5, scale: 2 })
  publicPct: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity('quarterly_results')
export class QuarterlyResult {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ length: 20 })
  ticker: string;

  @Column({ length: 10 })
  quarter: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  revenue: number | null;

  @Column({ name: 'net_profit', type: 'decimal', precision: 15, scale: 2, nullable: true })
  netProfit: number | null;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  ebitda: number | null;

  @Column({ name: 'yoy_growth', length: 10, nullable: true })
  yoyGrowth: string | null;

  @Column({ name: 'reported_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  reportedAt: Date;
}
