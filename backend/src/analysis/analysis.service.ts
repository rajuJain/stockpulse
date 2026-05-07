import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Stock, StockPrice, Fundamental, Shareholding, QuarterlyResult } from './analysis.entities';

@Injectable()
export class AnalysisService {
  constructor(
    @InjectRepository(Stock) private readonly stocks: Repository<Stock>,
    @InjectRepository(StockPrice) private readonly prices: Repository<StockPrice>,
    @InjectRepository(Fundamental) private readonly fund: Repository<Fundamental>,
    @InjectRepository(Shareholding) private readonly shareholding: Repository<Shareholding>,
    @InjectRepository(QuarterlyResult) private readonly quarters: Repository<QuarterlyResult>,
  ) {}

  // ── Price history for chart ─────────────────────────────────────────────
  async getPriceHistory(ticker: string, days = 90) {
    const from = new Date();
    from.setDate(from.getDate() - days);
    return this.prices.find({
      where: { ticker: ticker.toUpperCase(), date: Between(from, new Date()) },
      order: { date: 'ASC' },
    });
  }

  // ── Technical indicators computed from price history ────────────────────
  async getTechnicalIndicators(ticker: string) {
    const t = ticker.toUpperCase();
    const history = await this.getPriceHistory(t, 200);
    if (history.length === 0) throw new NotFoundException(`No price history for ${t}`);

    const closes = history.map(h => +h.close);
    const volumes = history.map(h => +h.volume);
    const last = closes[closes.length - 1];

    const sma = (period: number) => {
      if (closes.length < period) return null;
      const slice = closes.slice(-period);
      return Math.round(slice.reduce((a, b) => a + b, 0) / period);
    };

    const ema = (period: number) => {
      if (closes.length < period) return null;
      const k = 2 / (period + 1);
      let e = closes[0];
      for (let i = 1; i < closes.length; i++) e = closes[i] * k + e * (1 - k);
      return Math.round(e);
    };

    const rsi = (() => {
      if (closes.length < 15) return null;
      const slice = closes.slice(-15);
      let gain = 0, loss = 0;
      for (let i = 1; i < slice.length; i++) {
        const d = slice[i] - slice[i - 1];
        if (d > 0) gain += d; else loss += -d;
      }
      const rs = loss === 0 ? 100 : gain / loss;
      return Math.round(100 - 100 / (1 + rs));
    })();

    const macd = (() => {
      const e12 = ema(12), e26 = ema(26);
      if (e12 === null || e26 === null) return null;
      return +(e12 - e26).toFixed(2);
    })();

    const sma20 = sma(20);
    const stddev = (() => {
      if (!sma20 || closes.length < 20) return null;
      const slice = closes.slice(-20);
      const variance = slice.reduce((a, c) => a + (c - sma20) ** 2, 0) / 20;
      return Math.sqrt(variance);
    })();

    return {
      ticker: t,
      price: last,
      sma20, sma50: sma(50), sma200: sma(200),
      ema20: ema(20), ema50: ema(50),
      rsi,
      macd,
      macdSignal: macd !== null ? +(macd * 0.7).toFixed(2) : null,
      bollingerUpper: stddev && sma20 ? Math.round(sma20 + 2 * stddev) : null,
      bollingerMid: sma20,
      bollingerLower: stddev && sma20 ? Math.round(sma20 - 2 * stddev) : null,
      avgVolume: Math.round(volumes.slice(-30).reduce((a, b) => a + b, 0) / 30),
      trend: sma20 && sma(50) && sma20 > sma(50)! ? 'Bullish' : 'Bearish',
      signal:
        rsi && rsi > 70 ? 'SELL' :
        rsi && rsi < 30 ? 'BUY' :
        macd && macd > 0 ? 'BUY' : 'HOLD',
    };
  }

  // ── Fundamentals ────────────────────────────────────────────────────────
  async getFundamentals(ticker: string) {
    const data = await this.fund.findOne({ where: { ticker: ticker.toUpperCase() } });
    if (!data) throw new NotFoundException(`No fundamentals for ${ticker}`);
    return data;
  }

  // ── Shareholding ────────────────────────────────────────────────────────
  async getShareholding(ticker: string) {
    return this.shareholding.find({
      where: { ticker: ticker.toUpperCase() },
      order: { quarter: 'DESC' },
      take: 4,
    });
  }

  // ── Quarterly results ───────────────────────────────────────────────────
  async getQuarterlyResults(ticker: string) {
    return this.quarters.find({
      where: { ticker: ticker.toUpperCase() },
      order: { quarter: 'DESC' },
      take: 8,
    });
  }

  // ── Full analysis bundle ────────────────────────────────────────────────
  async getFullAnalysis(ticker: string) {
    const t = ticker.toUpperCase();
    const [stock, technical, fundamental, shareholding, quarters, priceHistory] = await Promise.all([
      this.stocks.findOne({ where: { ticker: t } }),
      this.getTechnicalIndicators(t).catch(() => null),
      this.getFundamentals(t).catch(() => null),
      this.getShareholding(t),
      this.getQuarterlyResults(t),
      this.getPriceHistory(t, 90),
    ]);
    if (!stock) throw new NotFoundException(`Stock ${t} not found`);
    return { stock, technical, fundamental, shareholding, quarters, priceHistory };
  }

  // ── List all stocks ─────────────────────────────────────────────────────
  listStocks() {
    return this.stocks.find({ order: { ticker: 'ASC' } });
  }
}
