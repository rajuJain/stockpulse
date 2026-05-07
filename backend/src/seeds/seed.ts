import 'reflect-metadata';
import { config } from 'dotenv';
import * as bcrypt from 'bcrypt';
import dataSource from '../datasource';
import { User, UserRole, UserStatus } from '../users/user.entity';
import { Plan, BillingCycle } from '../plans/plan.entity';
import { Tip, TipType, Sentiment, TipStatus, TipResult } from '../tips/tip.entity';
import { Stock, StockPrice, Fundamental, Shareholding, QuarterlyResult } from '../analysis/analysis.entities';

config();

// ─── Helpers ─────────────────────────────────────────────────────────────
const hash = (pw: string) => bcrypt.hash(pw, 10);
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };

/** Generate realistic OHLCV data for a ticker — ~200 trading days */
function generateOHLCV(ticker: string, startPrice: number, days = 200): Partial<StockPrice>[] {
  const result: Partial<StockPrice>[] = [];
  let price = startPrice;
  const drift = 0.0003;   // slight upward drift
  const vol = 0.016;      // daily volatility
  for (let i = days; i >= 0; i--) {
    const date = daysAgo(i);
    if (date.getDay() === 0 || date.getDay() === 6) continue; // skip weekends
    const ret = drift + vol * (Math.random() * 2 - 1);
    const open  = +price.toFixed(2);
    const close = +(price * (1 + ret)).toFixed(2);
    const high  = +(Math.max(open, close) * (1 + Math.random() * 0.008)).toFixed(2);
    const low   = +(Math.min(open, close) * (1 - Math.random() * 0.008)).toFixed(2);
    const volume = Math.floor(1_000_000 + Math.random() * 8_000_000);
    result.push({ ticker, date, open, high, low, close, volume });
    price = close;
  }
  return result;
}

async function seed() {
  await dataSource.initialize();
  console.log('🌱 Seeding StockPulse database...');

  const userRepo = dataSource.getRepository(User);
  const planRepo = dataSource.getRepository(Plan);
  const tipRepo = dataSource.getRepository(Tip);
  const stockRepo = dataSource.getRepository(Stock);
  const priceRepo = dataSource.getRepository(StockPrice);
  const fundRepo = dataSource.getRepository(Fundamental);
  const shareRepo = dataSource.getRepository(Shareholding);
  const qRepo = dataSource.getRepository(QuarterlyResult);

  // ── Users (password: "password123" for all) ─────────────────────────────
  console.log('Creating users...');
  const pw = await hash('password123');
  const users = await userRepo.save(userRepo.create([
    { name: 'Admin', handle: '@admin', email: 'admin@stockpulse.in', passwordHash: pw, role: UserRole.ADMIN, status: UserStatus.ACTIVE, bio: 'Platform administrator' },
    { name: 'Arjun Mehta', handle: '@arjunm', email: 'arjun@stockpulse.in', passwordHash: pw, sebi: true, regNo: 'INH000056789', sebiVerified: true, accuracy: 84.00, streak: 12, points: 9420, bio: 'SEBI-registered Research Analyst. Large-cap momentum specialist.' },
    { name: 'Priya Sharma', handle: '@priyas', email: 'priya@stockpulse.in', passwordHash: pw, sebi: true, regNo: 'INH000078234', sebiVerified: true, accuracy: 79.00, streak: 8, points: 7810, bio: 'SEBI-registered RA. Options and Bank Nifty specialist.' },
    { name: 'Rohan Das', handle: '@rohd', email: 'rohan@stockpulse.in', passwordHash: pw, sebi: true, regNo: 'INH000091045', sebiVerified: true, accuracy: 76.00, streak: 5, points: 6550, bio: 'SEBI-registered RA. Long-term fundamental investor.' },
    { name: 'Sneha Iyer', handle: '@snehai', email: 'sneha@stockpulse.in', passwordHash: pw, sebi: true, regNo: 'INH000034512', sebiVerified: false, accuracy: 71.00, streak: 3, points: 5200, bio: 'Macro analyst. Pending SEBI verification.' },
    { name: 'Vikram Nair', handle: '@vikn', email: 'vikram@stockpulse.in', passwordHash: pw, accuracy: 68.00, streak: 2, points: 4100, bio: 'Technical analyst. Independent.' },
    { name: 'Rahul Singh', handle: '@rahuls', email: 'rahul@stockpulse.in', passwordHash: pw, points: 820, bio: 'Retail trader. Following top SEBI analysts.' },
  ]));
  const [admin, arjun, priya, rohan, sneha, vikram, rahul] = users;

  // ── Plans (SEBI-verified only) ──────────────────────────────────────────
  console.log('Creating plans...');
  await planRepo.save(planRepo.create([
    { userId: arjun.id, name: 'Alpha Pro',  price: 1499, billingCycle: BillingCycle.MONTHLY, maxSubs: 300, focus: ['Daily Calls','Swing Trades','Positional Ideas'], perks: ['2-3 premium calls daily','Entry/SL/target','Weekend outlook','Priority Telegram','Monthly review'], subscriberCount: 214, totalRevenue: 320786, active: true },
    { userId: priya.id, name: 'Swing Edge', price: 999,  billingCycle: BillingCycle.MONTHLY, maxSubs: 250, focus: ['Swing Trades','Options Strategies'], perks: ['3-5 swing setups weekly','Entry/exit levels','SL management','Real-time alerts'], subscriberCount: 178, totalRevenue: 177822, active: true },
    { userId: rohan.id, name: 'LongView',   price: 699,  billingCycle: BillingCycle.MONTHLY, maxSubs: 200, focus: ['Long-Term Investments','Fundamental Picks'], perks: ['Weekly long-term picks','Earnings preview notes','Quarterly rebalance','Deep-dives'], subscriberCount: 95, totalRevenue: 66405, active: true },
  ]));

  // ── Stocks ──────────────────────────────────────────────────────────────
  console.log('Creating stocks...');
  await stockRepo.save(stockRepo.create([
    { ticker: 'RELIANCE',   name: 'Reliance Industries', sector: 'Energy',  industry: 'Diversified',    exchange: 'NSE', isIndex: false, currentPrice: 2847.00, dayChangePct: 1.20 },
    { ticker: 'TCS',        name: 'Tata Consultancy',    sector: 'IT',      industry: 'IT Services',    exchange: 'NSE', isIndex: false, currentPrice: 3921.00, dayChangePct: -0.40 },
    { ticker: 'HDFC',       name: 'HDFC Bank',           sector: 'Finance', industry: 'Private Bank',   exchange: 'NSE', isIndex: false, currentPrice: 1634.00, dayChangePct: 0.80 },
    { ticker: 'INFY',       name: 'Infosys',             sector: 'IT',      industry: 'IT Services',    exchange: 'NSE', isIndex: false, currentPrice: 1512.00, dayChangePct: -0.20 },
    { ticker: 'ITC',        name: 'ITC Ltd',             sector: 'FMCG',    industry: 'Tobacco/FMCG',   exchange: 'NSE', isIndex: false, currentPrice: 463.00,  dayChangePct: 0.50 },
    { ticker: 'WIPRO',      name: 'Wipro',               sector: 'IT',      industry: 'IT Services',    exchange: 'NSE', isIndex: false, currentPrice: 529.00,  dayChangePct: 1.10 },
    { ticker: 'MARUTI',     name: 'Maruti Suzuki',       sector: 'Auto',    industry: 'Passenger Cars', exchange: 'NSE', isIndex: false, currentPrice: 10850.00, dayChangePct: 0.70 },
    { ticker: 'BAJFINANCE', name: 'Bajaj Finance',       sector: 'Finance', industry: 'NBFC',           exchange: 'NSE', isIndex: false, currentPrice: 6780.00, dayChangePct: -0.90 },
    { ticker: 'NIFTY50',    name: 'Nifty 50 Index',      sector: 'Index',   industry: 'Index',          exchange: 'NSE', isIndex: true,  currentPrice: 22480.00, dayChangePct: 0.30 },
    { ticker: 'BANKNIFTY',  name: 'Bank Nifty Index',    sector: 'Index',   industry: 'Index',          exchange: 'NSE', isIndex: true,  currentPrice: 47320.00, dayChangePct: 0.60 },
  ]));

  // ── OHLCV history (200 trading days per ticker) ─────────────────────────
  console.log('Generating OHLCV history...');
  const tickerPrices: Record<string, number> = {
    RELIANCE: 2500, TCS: 3700, HDFC: 1500, INFY: 1400, ITC: 420,
    WIPRO: 480, MARUTI: 10200, BAJFINANCE: 7000, NIFTY50: 21500, BANKNIFTY: 45000,
  };
  for (const [ticker, startPrice] of Object.entries(tickerPrices)) {
    const ohlcv = generateOHLCV(ticker, startPrice, 200);
    await priceRepo.save(priceRepo.create(ohlcv));
  }
  console.log(`  ✓ Generated ${Object.keys(tickerPrices).length} tickers × 200 days`);

  // ── Fundamentals ────────────────────────────────────────────────────────
  console.log('Creating fundamentals...');
  await fundRepo.save(fundRepo.create([
    { ticker: 'RELIANCE', marketCap: '19.2L Cr', peRatio: 24.80, pbRatio: 3.60, eps: 114.70, bookValue: 1378.00, debtToEquity: 0.38, roe: 10.20, roce: 11.80, dividendYield: 0.32, faceValue: 10.00, week52High: 3024.00, week52Low: 2220.00, revenue: '9,74,864 Cr', netProfit: '79,020 Cr', ebitda: '1,78,677 Cr', ebitdaMargin: '18.3%', netProfitMargin: '8.1%', analystTarget: 3200.00, rating: 'BUY', description: "Reliance Industries is India's largest private-sector company with diversified interests across oil & gas, petrochemicals, retail, and digital services through Jio." },
    { ticker: 'TCS',      marketCap: '14.3L Cr', peRatio: 28.10, pbRatio: 12.40, eps: 139.60, bookValue: 316.00, debtToEquity: 0.02, roe: 48.30, roce: 62.10, dividendYield: 1.42, faceValue: 1.00, week52High: 4255.00, week52Low: 3311.00, revenue: '2,40,893 Cr', netProfit: '45,908 Cr', ebitda: '60,228 Cr', ebitdaMargin: '25.0%', netProfitMargin: '19.1%', analystTarget: 4400.00, rating: 'BUY', description: "TCS is India's largest IT services company offering consulting, technology and business solutions." },
    { ticker: 'HDFC',     marketCap: '12.4L Cr', peRatio: 18.60, pbRatio: 2.80, eps: 87.80, bookValue: 583.00, debtToEquity: 7.80, roe: 16.20, roce: 7.80, dividendYield: 1.10, faceValue: 1.00, week52High: 1794.00, week52Low: 1363.00, revenue: '2,87,416 Cr', netProfit: '64,062 Cr', ebitda: null, ebitdaMargin: 'N/A', netProfitMargin: '22.3%', analystTarget: 1900.00, rating: 'BUY', description: "HDFC Bank is India's largest private-sector bank by assets." },
    { ticker: 'ITC',      marketCap: '5.8L Cr', peRatio: 26.10, pbRatio: 7.20, eps: 17.70, bookValue: 64.00, debtToEquity: 0.00, roe: 28.60, roce: 37.90, dividendYield: 2.80, faceValue: 1.00, week52High: 508.00, week52Low: 394.00, revenue: '72,311 Cr', netProfit: '20,458 Cr', ebitda: '28,774 Cr', ebitdaMargin: '39.8%', netProfitMargin: '28.3%', analystTarget: 580.00, rating: 'BUY', description: "ITC is a diversified conglomerate with leading FMCG, hospitality, paperboards and agribusiness divisions." },
  ]));

  // ── Shareholding ────────────────────────────────────────────────────────
  await shareRepo.save(shareRepo.create([
    { ticker: 'RELIANCE', quarter: 'Q4 FY24', promoterPct: 50.33, fiiPct: 22.10, diiPct: 15.80, publicPct: 11.77 },
    { ticker: 'RELIANCE', quarter: 'Q3 FY24', promoterPct: 50.41, fiiPct: 22.30, diiPct: 15.40, publicPct: 11.89 },
    { ticker: 'TCS',      quarter: 'Q4 FY24', promoterPct: 72.30, fiiPct: 12.50, diiPct: 9.70, publicPct: 5.50 },
    { ticker: 'HDFC',     quarter: 'Q4 FY24', promoterPct: 0.00, fiiPct: 52.10, diiPct: 25.30, publicPct: 22.60 },
    { ticker: 'ITC',      quarter: 'Q4 FY24', promoterPct: 0.00, fiiPct: 43.80, diiPct: 44.60, publicPct: 11.60 },
  ]));

  // ── Quarterly Results ───────────────────────────────────────────────────
  await qRepo.save(qRepo.create([
    { ticker: 'RELIANCE', quarter: 'Q4 FY24', revenue: 240715, netProfit: 19299, ebitda: 44459, yoyGrowth: '+10.8%' },
    { ticker: 'RELIANCE', quarter: 'Q3 FY24', revenue: 248160, netProfit: 19641, ebitda: 40656, yoyGrowth: '+11.2%' },
    { ticker: 'TCS',      quarter: 'Q4 FY24', revenue: 61237, netProfit: 12434, ebitda: 15309, yoyGrowth: '+3.5%' },
    { ticker: 'TCS',      quarter: 'Q3 FY24', revenue: 60583, netProfit: 11058, ebitda: 15145, yoyGrowth: '+4.0%' },
    { ticker: 'HDFC',     quarter: 'Q4 FY24', revenue: 71473, netProfit: 16511, ebitda: null, yoyGrowth: '+21.0%' },
    { ticker: 'ITC',      quarter: 'Q4 FY24', revenue: 18250, netProfit: 5020, ebitda: 7263, yoyGrowth: '+1.8%' },
  ]));

  // ── Sample Tips ─────────────────────────────────────────────────────────
  console.log('Creating sample tips...');
  await tipRepo.save(tipRepo.create([
    { userId: arjun.id,  ticker: 'RELIANCE',   tipType: TipType.DAILY,    entry: 2820, target: 2920, sl: 2790, horizon: '1D', sentiment: Sentiment.BULL,    reason: 'Strong breakout above 2,800 resistance. Jio tariff hike news catalyst.', isPaid: false, status: TipStatus.OPEN, createdAt: daysAgo(0) },
    { userId: arjun.id,  ticker: 'HDFC',       tipType: TipType.SWING,    entry: 1620, target: 1720, sl: 1580, horizon: '2W', sentiment: Sentiment.BULL,    reason: 'Bank Nifty leader. FII buying picking up.', isPaid: true,  status: TipStatus.OPEN, createdAt: daysAgo(1) },
    { userId: priya.id,  ticker: 'BANKNIFTY',  tipType: TipType.DAILY,    entry: 47200, target: 47600, sl: 47000, horizon: '1D', sentiment: Sentiment.BULL,  reason: 'Gap-up opening expected. HDFC + ICICI leading.', isPaid: false, status: TipStatus.OPEN, createdAt: daysAgo(0) },
    { userId: priya.id,  ticker: 'BAJFINANCE', tipType: TipType.SWING,    entry: 6750, target: 7100, sl: 6600, horizon: '3W', sentiment: Sentiment.BULL,    reason: 'Rate cut expectation + strong AUM growth.', isPaid: true,  status: TipStatus.OPEN, createdAt: daysAgo(2) },
    { userId: rohan.id,  ticker: 'ITC',        tipType: TipType.LONGTERM, entry: 460, target: 580, sl: 420, horizon: '6M', sentiment: Sentiment.BULL,      reason: 'Hotels demerger unlocking value. FMCG business at inflection.', isPaid: false, status: TipStatus.OPEN, createdAt: daysAgo(3) },
    { userId: rohan.id,  ticker: 'TCS',        tipType: TipType.LONGTERM, entry: 3900, target: 4600, sl: 3650, horizon: '1Y', sentiment: Sentiment.BULL,   reason: 'AI services order book growing. Valuation comfort at 28x.', isPaid: true,  status: TipStatus.OPEN, createdAt: daysAgo(5) },
    { userId: sneha.id,  ticker: 'MARUTI',     tipType: TipType.SWING,    entry: 10800, target: 11400, sl: 10500, horizon: '1M', sentiment: Sentiment.BULL, reason: 'SUV launches, rural recovery.', isPaid: false, status: TipStatus.OPEN, createdAt: daysAgo(1) },
    { userId: vikram.id, ticker: 'INFY',       tipType: TipType.DAILY,    entry: 1520, target: 1480, sl: 1540, horizon: '1D', sentiment: Sentiment.BEAR,    reason: 'Head & shoulders forming. Weak Q4 guidance likely.', isPaid: false, status: TipStatus.OPEN, createdAt: daysAgo(0) },
    // Resolved tips for accuracy stats
    { userId: arjun.id,  ticker: 'WIPRO',      tipType: TipType.SWING,    entry: 510, target: 540, sl: 495, horizon: '2W', sentiment: Sentiment.BULL, reason: 'Deal momentum.', isPaid: false, status: TipStatus.TARGET_HIT, result: TipResult.WIN, exitPrice: 542, resolvedAt: daysAgo(7), createdAt: daysAgo(21) },
    { userId: arjun.id,  ticker: 'TCS',        tipType: TipType.SWING,    entry: 3850, target: 4050, sl: 3750, horizon: '2W', sentiment: Sentiment.BULL, reason: 'Strong Q4.', isPaid: false, status: TipStatus.TARGET_HIT, result: TipResult.WIN, exitPrice: 4065, resolvedAt: daysAgo(12), createdAt: daysAgo(26) },
    { userId: priya.id,  ticker: 'BANKNIFTY',  tipType: TipType.DAILY,    entry: 46800, target: 47200, sl: 46600, horizon: '1D', sentiment: Sentiment.BULL, reason: 'Gap-up play.', isPaid: false, status: TipStatus.TARGET_HIT, result: TipResult.WIN, exitPrice: 47280, resolvedAt: daysAgo(4), createdAt: daysAgo(5) },
    { userId: priya.id,  ticker: 'NIFTY50',    tipType: TipType.DAILY,    entry: 22300, target: 22500, sl: 22180, horizon: '1D', sentiment: Sentiment.BULL, reason: 'Globally strong.', isPaid: false, status: TipStatus.SL_HIT, result: TipResult.LOSS, exitPrice: 22180, resolvedAt: daysAgo(8), createdAt: daysAgo(9) },
    { userId: rohan.id,  ticker: 'RELIANCE',   tipType: TipType.LONGTERM, entry: 2600, target: 2850, sl: 2450, horizon: '3M', sentiment: Sentiment.BULL, reason: 'Green energy pivot.', isPaid: false, status: TipStatus.TARGET_HIT, result: TipResult.WIN, exitPrice: 2855, resolvedAt: daysAgo(15), createdAt: daysAgo(75) },
  ]));

  console.log('\n✅ Seed complete!\n');
  console.log('Demo login credentials (password: "password123" for all):');
  console.log('  Admin:          admin@stockpulse.in');
  console.log('  SEBI Analyst 1: arjun@stockpulse.in');
  console.log('  SEBI Analyst 2: priya@stockpulse.in');
  console.log('  SEBI Analyst 3: rohan@stockpulse.in');
  console.log('  Pending SEBI:   sneha@stockpulse.in');
  console.log('  Independent:    vikram@stockpulse.in');
  console.log('  Retail User:    rahul@stockpulse.in\n');

  await dataSource.destroy();
}

seed().catch(err => { console.error(err); process.exit(1); });
