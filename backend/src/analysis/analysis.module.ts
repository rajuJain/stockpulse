import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalysisService } from './analysis.service';
import { Stock, StockPrice, Fundamental, Shareholding, QuarterlyResult } from './analysis.entities';

@ApiTags('analysis')
@Controller({ path: 'analysis', version: '1' })
export class AnalysisController {
  constructor(private readonly service: AnalysisService) {}

  @Get('stocks')
  @ApiOperation({ summary: 'List all tracked stocks' })
  listStocks() { return this.service.listStocks(); }

  @Get(':ticker')
  @ApiOperation({ summary: 'Full analysis bundle (price, technical, fundamental, shareholding, quarters)' })
  fullAnalysis(@Param('ticker') ticker: string) {
    return this.service.getFullAnalysis(ticker);
  }

  @Get(':ticker/prices')
  @ApiOperation({ summary: 'Historical price data' })
  prices(@Param('ticker') ticker: string, @Query('days') days?: string) {
    return this.service.getPriceHistory(ticker, days ? +days : 90);
  }

  @Get(':ticker/technical')
  @ApiOperation({ summary: 'Technical indicators (SMA, EMA, RSI, MACD, Bollinger)' })
  technical(@Param('ticker') ticker: string) {
    return this.service.getTechnicalIndicators(ticker);
  }

  @Get(':ticker/fundamental')
  @ApiOperation({ summary: 'Fundamental financial metrics' })
  fundamental(@Param('ticker') ticker: string) {
    return this.service.getFundamentals(ticker);
  }

  @Get(':ticker/shareholding')
  shareholding(@Param('ticker') ticker: string) {
    return this.service.getShareholding(ticker);
  }

  @Get(':ticker/quarters')
  quarters(@Param('ticker') ticker: string) {
    return this.service.getQuarterlyResults(ticker);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Stock, StockPrice, Fundamental, Shareholding, QuarterlyResult])],
  providers: [AnalysisService],
  controllers: [AnalysisController],
  exports: [AnalysisService],
})
export class AnalysisModule {}
