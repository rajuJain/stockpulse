export type UserRole = 'user' | 'admin';
export type UserStatus = 'active' | 'suspended' | 'deleted';
export type TipType = 'daily' | 'swing' | 'longterm';
export type Sentiment = 'bull' | 'bear' | 'neutral';
export type TipStatus = 'open' | 'target_hit' | 'sl_hit' | 'expired';
export type TipResult = 'win' | 'loss';

export interface User {
  id: number;
  name: string;
  handle: string;
  email: string;
  avatarUrl?: string;
  bio?: string;
  role: UserRole;
  status: UserStatus;
  sebi: boolean;
  regNo?: string;
  sebiVerified: boolean;
  accuracy?: number;
  streak: number;
  points: number;
  followersCount: number;
  createdAt: string;
}

export interface Tip {
  id: number;
  userId: number;
  user?: User;
  ticker: string;
  tipType: TipType;
  entry?: number;
  target: number;
  sl?: number;
  horizon: string;
  sentiment: Sentiment;
  reason?: string;
  isPaid: boolean;
  status: TipStatus;
  result?: TipResult;
  exitPrice?: number;
  locked?: boolean;
  createdAt: string;
}

export interface Plan {
  id: number;
  userId: number;
  user?: User;
  name: string;
  description?: string;
  price: number;
  billingCycle: 'monthly' | 'quarterly' | 'yearly';
  maxSubs: number;
  focus: string[];
  perks: string[];
  active: boolean;
  subscriberCount: number;
  totalRevenue: number;
}

export interface Subscription {
  id: number;
  subscriberId: number;
  planId: number;
  analystId: number;
  plan?: Plan;
  analyst?: User;
  status: 'active' | 'cancelled' | 'expired' | 'paused';
  startedAt: string;
  currentEnd: string;
}

export interface CrowdTarget {
  ticker: string;
  count: number;
  avgTarget: number;
  sentiments: { bull: number; bear: number; neutral: number };
  confidence: number;
}

export interface AnalystStats {
  total: number;
  free: number;
  paid: number;
  open: number;
  overallAccuracy: number | null;
  freeAccuracy: number | null;
  resolved: number;
  wins: number;
  byType: Record<TipType, { total: number; wins: number; accuracy: number | null }>;
}

export interface Stock {
  ticker: string;
  name: string;
  sector?: string;
  industry?: string;
  exchange: string;
  isIndex: boolean;
  currentPrice: number;
  dayChangePct: number;
}

export interface FullAnalysis {
  stock: Stock;
  technical: any;
  fundamental: any;
  shareholding: any[];
  quarters: any[];
  priceHistory: Array<{ date: string; open: number; high: number; low: number; close: number; volume: number }>;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}
