import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { NgApexchartsModule } from 'ng-apexcharts';
import { AnalysisService } from '../../core/services/api.services';
import { Stock, FullAnalysis } from '../../core/models';

@Component({
  standalone: true,
  selector: 'sp-analysis',
  imports: [CommonModule, FormsModule, MatCardModule, MatSelectModule, MatTabsModule, MatFormFieldModule, MatButtonToggleModule, MatChipsModule, MatIconModule, NgApexchartsModule],
  template: `
    <div class="analysis-wrap">
      <!-- Header -->
      <div class="header">
        <div class="h-left">
          <h2>{{ data()?.stock?.name || ticker() }}</h2>
          <div class="meta">
            <span class="ticker">{{ ticker() }}</span>
            @if (data()?.stock?.sector) { <span class="sector">{{ data()?.stock?.sector }}</span> }
            @if (data()?.stock?.currentPrice) {
              <span class="price">₹{{ data()!.stock.currentPrice | number:'1.2-2' }}</span>
              <span class="chg" [class.up]="(data()!.stock.dayChangePct ?? 0) > 0" [class.dn]="(data()!.stock.dayChangePct ?? 0) < 0">
                {{ (data()!.stock.dayChangePct ?? 0) > 0 ? '+' : '' }}{{ data()!.stock.dayChangePct }}%
              </span>
            }
          </div>
        </div>
        <mat-form-field appearance="outline">
          <mat-label>Select Stock</mat-label>
          <mat-select [(ngModel)]="selectedTicker" (selectionChange)="loadAnalysis()">
            @for (s of stocks(); track s.ticker) {
              <mat-option [value]="s.ticker">{{ s.ticker }} — {{ s.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>

      <!-- Tabs -->
      <mat-tab-group>
        <!-- TECHNICAL -->
        <mat-tab label="Technical Analysis">
          @if (data()?.technical) {
            <div class="tech-grid">
              <div class="charts">
                <mat-card class="chart-card">
                  <div class="chart-label">Price Chart (₹)</div>
                  <apx-chart
                    [series]="priceSeries()" [chart]="priceChartOpts" [xaxis]="xaxis()" [yaxis]="priceYAxis"
                    [stroke]="stroke" [fill]="fill" [grid]="grid" [tooltip]="tooltip" [colors]="['#2DD4BF']" height="320">
                  </apx-chart>
                </mat-card>

                <mat-card class="chart-card">
                  <div class="chart-label">Volume</div>
                  <apx-chart [series]="volumeSeries()" [chart]="{ type: 'bar', height: 120, toolbar: { show: false } }"
                    [xaxis]="xaxis()" [colors]="['#2DD4BF']" [plotOptions]="{ bar: { borderRadius: 2 } }" [dataLabels]="{ enabled: false }">
                  </apx-chart>
                </mat-card>
              </div>

              <div class="indicators">
                <mat-card class="signal-card" [style.border-color]="signalColor()">
                  <div class="lbl">Technical Signal</div>
                  <div class="signal" [style.color]="signalColor()">{{ data()!.technical.signal }}</div>
                  <div class="trend">Trend: <b [style.color]="data()!.technical.trend === 'Bullish' ? '#2DD4BF' : '#EF4444'">{{ data()!.technical.trend }}</b></div>
                </mat-card>

                <mat-card class="ind-card">
                  <div class="lbl">Oscillators</div>
                  <div class="row"><span>RSI (14)</span>
                    <b [class.dn]="(data()!.technical.rsi ?? 50) > 70" [class.up]="(data()!.technical.rsi ?? 50) < 30">
                      {{ data()!.technical.rsi }}
                    </b>
                  </div>
                  <div class="row"><span>MACD</span><b [class.up]="data()!.technical.macd > 0" [class.dn]="data()!.technical.macd < 0">{{ data()!.technical.macd }}</b></div>
                  <div class="row"><span>Signal</span><b>{{ data()!.technical.macdSignal }}</b></div>
                </mat-card>

                <mat-card class="ind-card">
                  <div class="lbl">Moving Averages</div>
                  <div class="row"><span>SMA 20</span><b>₹{{ data()!.technical.sma20 | number:'1.0-0' }}</b></div>
                  <div class="row"><span>SMA 50</span><b>₹{{ data()!.technical.sma50 | number:'1.0-0' }}</b></div>
                  <div class="row"><span>SMA 200</span><b>₹{{ data()!.technical.sma200 | number:'1.0-0' }}</b></div>
                  <div class="row"><span>EMA 20</span><b>₹{{ data()!.technical.ema20 | number:'1.0-0' }}</b></div>
                </mat-card>

                <mat-card class="ind-card">
                  <div class="lbl">Volatility</div>
                  <div class="row"><span>Bollinger Upper</span><b>₹{{ data()!.technical.bollingerUpper | number:'1.0-0' }}</b></div>
                  <div class="row"><span>Bollinger Mid</span><b>₹{{ data()!.technical.bollingerMid | number:'1.0-0' }}</b></div>
                  <div class="row"><span>Bollinger Lower</span><b>₹{{ data()!.technical.bollingerLower | number:'1.0-0' }}</b></div>
                </mat-card>
              </div>
            </div>
          } @else { <div class="empty">No technical data yet. Price history is being populated.</div> }
        </mat-tab>

        <!-- FUNDAMENTAL -->
        <mat-tab label="Fundamental Analysis">
          @if (data()?.fundamental) {
            <mat-card class="overview">
              <p>{{ data()!.fundamental.description }}</p>
              <div class="chips">
                <mat-chip>Market Cap: {{ data()!.fundamental.marketCap }}</mat-chip>
                <mat-chip class="rating">Rating: {{ data()!.fundamental.rating }}</mat-chip>
                <mat-chip>Target: ₹{{ data()!.fundamental.analystTarget | number:'1.0-0' }}</mat-chip>
              </div>
            </mat-card>

            <div class="fund-grid">
              <mat-card class="ind-card">
                <div class="lbl">Valuation</div>
                <div class="row"><span>P/E Ratio</span><b>{{ data()!.fundamental.peRatio }}</b></div>
                <div class="row"><span>P/B Ratio</span><b>{{ data()!.fundamental.pbRatio }}</b></div>
                <div class="row"><span>EPS (TTM)</span><b>₹{{ data()!.fundamental.eps }}</b></div>
                <div class="row"><span>Book Value</span><b>₹{{ data()!.fundamental.bookValue }}</b></div>
                <div class="row"><span>Dividend Yield</span><b>{{ data()!.fundamental.dividendYield }}%</b></div>
              </mat-card>

              <mat-card class="ind-card">
                <div class="lbl">Quality & Returns</div>
                <div class="row"><span>ROE</span><b class="up">{{ data()!.fundamental.roe }}%</b></div>
                <div class="row"><span>ROCE</span><b class="up">{{ data()!.fundamental.roce }}%</b></div>
                <div class="row"><span>Debt / Equity</span><b>{{ data()!.fundamental.debtToEquity }}</b></div>
                <div class="row"><span>EBITDA Margin</span><b>{{ data()!.fundamental.ebitdaMargin }}</b></div>
                <div class="row"><span>Net Margin</span><b>{{ data()!.fundamental.netProfitMargin }}</b></div>
              </mat-card>

              <mat-card class="ind-card">
                <div class="lbl">Financials (TTM)</div>
                <div class="row"><span>Revenue</span><b>{{ data()!.fundamental.revenue }}</b></div>
                <div class="row"><span>Net Profit</span><b class="up">{{ data()!.fundamental.netProfit }}</b></div>
                <div class="row"><span>EBITDA</span><b>{{ data()!.fundamental.ebitda }}</b></div>
                <div class="row"><span>52W High</span><b>₹{{ data()!.fundamental.week52High }}</b></div>
                <div class="row"><span>52W Low</span><b>₹{{ data()!.fundamental.week52Low }}</b></div>
              </mat-card>

              @if (data()!.shareholding?.length) {
                <mat-card class="ind-card">
                  <div class="lbl">Shareholding (Latest)</div>
                  @for (item of [
                    { l: 'Promoters', v: data()!.shareholding[0].promoterPct, c: '#2DD4BF' },
                    { l: 'FII', v: data()!.shareholding[0].fiiPct, c: '#818CF8' },
                    { l: 'DII', v: data()!.shareholding[0].diiPct, c: '#F59E0B' },
                    { l: 'Public', v: data()!.shareholding[0].publicPct, c: '#64748B' }
                  ]; track item.l) {
                    <div class="sh-row">
                      <div class="sh-head"><span>{{ item.l }}</span><b [style.color]="item.c">{{ item.v }}%</b></div>
                      <div class="sh-bar"><div class="sh-fill" [style.width.%]="item.v" [style.background]="item.c"></div></div>
                    </div>
                  }
                </mat-card>
              }
            </div>

            @if (data()!.quarters?.length) {
              <mat-card class="quarters">
                <div class="lbl">Quarterly Results (₹ Cr)</div>
                <table>
                  <thead><tr><th>Quarter</th><th>Revenue</th><th>Net Profit</th><th>EBITDA</th><th>YoY</th></tr></thead>
                  <tbody>
                    @for (q of data()!.quarters; track q.quarter) {
                      <tr>
                        <td><b>{{ q.quarter }}</b></td>
                        <td>{{ q.revenue | number }}</td>
                        <td class="up">{{ q.netProfit | number }}</td>
                        <td>{{ q.ebitda ? (q.ebitda | number) : '—' }}</td>
                        <td [class.up]="q.yoyGrowth?.startsWith('+')" [class.dn]="q.yoyGrowth?.startsWith('-')">{{ q.yoyGrowth }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </mat-card>
            }
          } @else { <div class="empty">Fundamental data not available.</div> }
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [`
    .analysis-wrap { padding:20px; max-width:1280px; margin:0 auto; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; margin-bottom:18px; flex-wrap:wrap; }
    .h-left h2 { margin:0 0 6px; font-size:20px; font-weight:700; }
    .meta { display:flex; align-items:center; gap:10px; flex-wrap:wrap; font-size:13px; }
    .ticker { background:var(--sp-raised); color:var(--sp-ink); padding:3px 9px; border-radius:4px; font-weight:700; }
    .sector { color:var(--sp-ink-dim); font-size:12px; }
    .price { font-size:22px; font-weight:700; margin-left:4px; }
    .chg.up { color:var(--sp-teal); font-weight:700; }
    .chg.dn { color:var(--sp-red); font-weight:700; }

    .tech-grid { display:grid; grid-template-columns:1fr 320px; gap:16px; padding:16px 0; }
    .charts { display:flex; flex-direction:column; gap:12px; }
    .chart-card { padding:14px; background:var(--sp-raised); }
    .chart-label { font-size:10px; font-weight:700; letter-spacing:0.07em; text-transform:uppercase; color:var(--sp-ink-xs); margin-bottom:8px; }

    .indicators { display:flex; flex-direction:column; gap:10px; }
    .signal-card { padding:14px 16px; background:var(--sp-raised); border:1px solid transparent; }
    .lbl { font-size:10px; font-weight:700; letter-spacing:0.07em; text-transform:uppercase; color:var(--sp-ink-xs); margin-bottom:8px; }
    .signal { font-weight:700; font-size:26px; margin:4px 0; }
    .trend { color:var(--sp-ink-dim); font-size:12px; }
    .ind-card { padding:14px 16px; background:var(--sp-raised); }
    .row { display:flex; justify-content:space-between; padding:7px 0; border-bottom:1px solid var(--sp-line); font-size:13px; }
    .row:last-child { border-bottom:none; }
    .row span { color:var(--sp-ink-dim); }
    .row b { font-weight:700; color:var(--sp-ink); }
    .up { color:var(--sp-teal); } .dn { color:var(--sp-red); }

    .overview { padding:18px; margin:16px 0; background:var(--sp-raised); }
    .overview p { color:var(--sp-ink-md); line-height:1.6; margin:0 0 12px; font-size:13px; }
    .chips { display:flex; gap:8px; flex-wrap:wrap; }

    .fund-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:14px; padding:8px 0 14px; }

    .sh-row { margin-bottom:10px; }
    .sh-head { display:flex; justify-content:space-between; font-size:12.5px; margin-bottom:4px; }
    .sh-bar { height:5px; background:var(--sp-line); border-radius:3px; overflow:hidden; }
    .sh-fill { height:100%; transition:width 0.3s ease; }

    .quarters { padding:14px 16px; background:var(--sp-raised); margin-top:10px; }
    .quarters table { width:100%; border-collapse:collapse; font-size:13px; }
    .quarters th { text-align:left; font-size:10px; text-transform:uppercase; color:var(--sp-ink-xs); padding:8px 12px; border-bottom:1px solid var(--sp-line); font-weight:700; letter-spacing:0.07em; }
    .quarters td { padding:9px 12px; border-bottom:1px solid var(--sp-line); }

    .empty { text-align:center; padding:50px; color:var(--sp-ink-dim); font-size:13px; }

    @media (max-width: 900px) { .tech-grid { grid-template-columns:1fr; } }
  `],
})
export class AnalysisComponent implements OnInit {
  private api = inject(AnalysisService);

  stocks = signal<Stock[]>([]);
  data = signal<FullAnalysis | null>(null);
  selectedTicker = 'RELIANCE';

  ticker = computed(() => this.selectedTicker);
  signalColor = computed(() => {
    const s = this.data()?.technical?.signal;
    return s === 'BUY' ? '#2DD4BF' : s === 'SELL' ? '#EF4444' : '#F59E0B';
  });

  priceSeries = computed(() => [{
    name: 'Price',
    data: (this.data()?.priceHistory || []).map(p => +p.close),
  }]);

  volumeSeries = computed(() => [{
    name: 'Volume',
    data: (this.data()?.priceHistory || []).map(p => +p.volume),
  }]);

  xaxis = computed(() => ({
    categories: (this.data()?.priceHistory || []).map(p => p.date),
    labels: { style: { colors: '#94A3B8', fontSize: '10px' } },
    axisBorder: { show: false },
  }));

  priceChartOpts = { type: 'area' as const, height: 320, toolbar: { show: false }, background: 'transparent', foreColor: '#94A3B8', zoom: { enabled: true } };
  priceYAxis = { labels: { style: { colors: '#94A3B8', fontSize: '10px' }, formatter: (v: number) => '₹' + v.toFixed(0) } };
  stroke = { curve: 'smooth' as const, width: 2 };
  fill = { type: 'gradient' as const, gradient: { opacityFrom: 0.3, opacityTo: 0.0, shadeIntensity: 1 } };
  grid = { borderColor: 'rgba(148,163,184,0.12)', strokeDashArray: 3 };
  tooltip = { theme: 'dark' as const, x: { format: 'dd MMM' } };

  ngOnInit(): void {
    this.api.listStocks().subscribe(s => {
      this.stocks.set(s);
      this.loadAnalysis();
    });
  }

  loadAnalysis(): void {
    this.api.fullAnalysis(this.selectedTicker).subscribe({
      next: d => this.data.set(d),
      error: () => this.data.set(null),
    });
  }
}
