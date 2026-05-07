import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AnalysisService, WatchlistService } from '../../core/services/api.services';
import { Stock } from '../../core/models';

@Component({
  standalone: true,
  selector: 'sp-watchlist',
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
  template: `
    <div class="wrap">
      <h2>Watchlist</h2>
      <p class="sub">Track your stocks — live prices and community calls</p>

      <div class="grid">
        @for (s of stocks(); track s.ticker) {
          <mat-card class="stock-card" (click)="router.navigate(['/analysis'], { queryParams: { t: s.ticker } })">
            <div class="sc-head">
              <div>
                <div class="ticker">{{ s.ticker }}</div>
                <div class="name">{{ s.name }}</div>
              </div>
              <button mat-icon-button (click)="toggle(s.ticker); $event.stopPropagation()">
                <mat-icon [style.color]="watched().has(s.ticker) ? 'var(--sp-teal)' : 'var(--sp-ink-dim)'">
                  {{ watched().has(s.ticker) ? 'bookmark' : 'bookmark_border' }}
                </mat-icon>
              </button>
            </div>
            <div class="price">₹{{ s.currentPrice | number:'1.2-2' }}</div>
            <div class="chg" [class.up]="(s.dayChangePct ?? 0) > 0" [class.dn]="(s.dayChangePct ?? 0) < 0">
              {{ (s.dayChangePct ?? 0) > 0 ? '▲' : '▼' }} {{ s.dayChangePct }}%
            </div>
          </mat-card>
        }
      </div>
    </div>
  `,
  styles: [`
    .wrap { padding:24px; max-width:1100px; margin:0 auto; }
    h2 { margin:0 0 4px; font-size:22px; font-weight:700; }
    .sub { color:var(--sp-ink-dim); font-size:13px; margin-bottom:20px; }
    .grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(240px, 1fr)); gap:12px; }
    .stock-card { padding:16px; background:var(--sp-surface); cursor:pointer; transition:all 0.15s; }
    .stock-card:hover { transform:translateY(-2px); border:1px solid var(--sp-teal-dim); }
    .sc-head { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px; }
    .ticker { font-weight:700; font-size:16px; }
    .name { font-size:11px; color:var(--sp-ink-dim); margin-top:2px; }
    .price { font-size:22px; font-weight:700; margin:8px 0 2px; }
    .chg { font-size:12px; font-weight:600; }
    .chg.up { color:var(--sp-teal); } .chg.dn { color:var(--sp-red); }
  `],
})
export class WatchlistComponent implements OnInit {
  private analysis = inject(AnalysisService);
  private wl = inject(WatchlistService);
  router = inject(Router);

  stocks = signal<Stock[]>([]);
  watched = signal<Set<string>>(new Set());

  ngOnInit(): void {
    this.analysis.listStocks().subscribe(s => this.stocks.set(s));
    this.wl.list().subscribe(w => this.watched.set(new Set(w.map(x => x.ticker))));
  }

  toggle(ticker: string): void {
    const set = new Set(this.watched());
    if (set.has(ticker)) {
      this.wl.remove(ticker).subscribe(() => { set.delete(ticker); this.watched.set(set); });
    } else {
      this.wl.add(ticker).subscribe(() => { set.add(ticker); this.watched.set(set); });
    }
  }
}
