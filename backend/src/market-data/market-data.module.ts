import { Injectable, Module, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Stock } from '../analysis/analysis.entities';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { RealtimeModule } from '../realtime/realtime.module';

/**
 * Market data service — in production this connects to Upstox/Zerodha WebSocket
 * for real-time prices, and to Alpha Vantage for historical/fundamental data.
 * For development, this module emits simulated price updates for connected clients.
 */
@Injectable()
export class MarketDataService {
  private readonly logger = new Logger('MarketDataService');

  constructor(
    @InjectRepository(Stock) private readonly stocks: Repository<Stock>,
    private readonly gateway: RealtimeGateway,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async simulatePriceUpdates() {
    if (process.env.MARKET_DATA_SIMULATE !== 'true') return;
    const stocks = await this.stocks.find();
    for (const s of stocks) {
      const currentPrice = +s.currentPrice!;
      const change = (Math.random() - 0.5) * currentPrice * 0.002;
      const newPrice = +(currentPrice + change).toFixed(2);
      const pctChange = +(((newPrice - currentPrice) / currentPrice) * 100).toFixed(2);
      s.currentPrice = newPrice;
      s.dayChangePct = pctChange;
      await this.stocks.save(s);
      this.gateway.broadcastPriceUpdate(s.ticker, newPrice, pctChange);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_6PM)
  async syncEodData() {
    this.logger.log('Running end-of-day data sync (placeholder)');
    // In production: fetch OHLCV from Alpha Vantage for all tickers and bulk insert into stock_prices
  }

  @Cron(CronExpression.EVERY_WEEK)
  async syncFundamentals() {
    this.logger.log('Syncing fundamental data (placeholder)');
    // In production: fetch from Screener.in / Trendlyne and update fundamentals table
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Stock]), RealtimeModule],
  providers: [MarketDataService],
  exports: [MarketDataService],
})
export class MarketDataModule {}
