import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { formatDistanceToNow } from 'date-fns';
import { TipsService } from '../../core/services/api.services';
import { AuthService } from '../../core/services/auth.service';
import { RealtimeService } from '../../core/services/realtime.service';
import { Tip, TipType } from '../../core/models';

@Component({
  standalone: true,
  selector: 'sp-feed',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatChipsModule, MatButtonToggleModule],
  template: `
    <div class="feed-wrap">
      <!-- Composer -->
      <mat-card class="composer">
        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="composer-head">
            <div class="avatar">{{ initials() }}</div>
            <input matInput formControlName="content" placeholder="Share a market insight or a new call..." maxlength="280" class="content-input">
          </div>

          <div class="tip-fields">
            <mat-form-field appearance="outline" class="small">
              <mat-label>Ticker</mat-label>
              <mat-select formControlName="ticker">
                @for (t of tickers; track t) { <mat-option [value]="t">{{ t }}</mat-option> }
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="small">
              <mat-label>Type</mat-label>
              <mat-select formControlName="tipType">
                <mat-option value="daily">⚡ Daily</mat-option>
                <mat-option value="swing">📈 Swing</mat-option>
                <mat-option value="longterm">🏛 Long-Term</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="small">
              <mat-label>Entry</mat-label>
              <input matInput type="number" formControlName="entry">
            </mat-form-field>

            <mat-form-field appearance="outline" class="small">
              <mat-label>Target</mat-label>
              <input matInput type="number" formControlName="target">
            </mat-form-field>

            <mat-form-field appearance="outline" class="small">
              <mat-label>Stop Loss</mat-label>
              <input matInput type="number" formControlName="sl">
            </mat-form-field>

            <mat-form-field appearance="outline" class="small">
              <mat-label>Direction</mat-label>
              <mat-select formControlName="sentiment">
                <mat-option value="bull">Bullish</mat-option>
                <mat-option value="bear">Bearish</mat-option>
                <mat-option value="neutral">Neutral</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <div class="visibility-row">
            <mat-button-toggle-group formControlName="isPaid">
              <mat-button-toggle [value]="false">
                <mat-icon>public</mat-icon> Free for All
              </mat-button-toggle>
              <mat-button-toggle [value]="true" [disabled]="!canOfferPlan()">
                <mat-icon>star</mat-icon> Subscribers Only
              </mat-button-toggle>
            </mat-button-toggle-group>
            @if (!canOfferPlan()) {
              <span class="sebi-hint">SEBI verification required for premium</span>
            }
            <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid">
              Publish
            </button>
          </div>
        </form>
      </mat-card>

      <!-- Filter -->
      <div class="filters">
        <mat-button-toggle-group [(ngModel)]="typeFilter" (change)="loadFeed()">
          <mat-button-toggle [value]="null">All</mat-button-toggle>
          <mat-button-toggle value="daily">⚡ Daily</mat-button-toggle>
          <mat-button-toggle value="swing">📈 Swing</mat-button-toggle>
          <mat-button-toggle value="longterm">🏛 Long-Term</mat-button-toggle>
        </mat-button-toggle-group>
      </div>

      <!-- Feed -->
      @for (tip of tips(); track tip.id) {
        <mat-card class="tip-card" [class.locked]="tip.locked">
          <div class="tip-head">
            <div class="avatar sm">{{ initialsOf(tip.user?.name) }}</div>
            <div class="th-main">
              <div class="name-row">
                <a class="name" [routerLink]="['/analysts', tip.userId]">{{ tip.user?.name }}</a>
                @if (tip.user?.sebiVerified) { <span class="chip sebi">✓ SEBI</span> }
                @else { <span class="chip independent">Independent</span> }
                <span class="handle">{{ tip.user?.handle }}</span>
              </div>
              <div class="meta-row">
                <span class="ticker">{{ tip.ticker }}</span>
                <span class="type">
                  {{ tip.tipType === 'daily' ? '⚡ Daily' : tip.tipType === 'swing' ? '📈 Swing' : '🏛 Long-Term' }}
                </span>
                <span class="sentiment" [class]="tip.sentiment">{{ tip.sentiment | titlecase }}</span>
                @if (tip.isPaid) { <span class="chip premium">PREMIUM</span> }
                <span class="time">{{ timeAgo(tip.createdAt) }}</span>
              </div>
            </div>
          </div>

          @if (tip.locked) {
            <div class="locked-body">
              <mat-icon>lock</mat-icon>
              <div>This is a premium tip. <a [routerLink]="['/analysts', tip.userId]">Subscribe</a> to view full details.</div>
            </div>
          } @else {
            @if (tip.reason) { <p class="reason">{{ tip.reason }}</p> }
            <div class="levels">
              @if (tip.entry)  { <div><span>Entry</span><b>₹{{ tip.entry | number:'1.0-2' }}</b></div> }
              <div><span>Target</span><b class="up">₹{{ tip.target | number:'1.0-2' }}</b></div>
              @if (tip.sl) { <div><span>SL</span><b class="dn">₹{{ tip.sl | number:'1.0-2' }}</b></div> }
              <div><span>Horizon</span><b>{{ tip.horizon }}</b></div>
            </div>
            @if (!tip.user?.sebiVerified) {
              <div class="disclaimer">
                Independent analyst — not SEBI registered. This is a personal view, not investment advice.
              </div>
            }
          }
        </mat-card>
      }

      @if (loading()) { <div class="loading">Loading…</div> }
      @if (tips().length === 0 && !loading()) { <div class="empty">No tips yet. Be the first to post.</div> }
    </div>
  `,
  styles: [`
    .feed-wrap { max-width:720px; margin:0 auto; padding:20px 16px; display:flex; flex-direction:column; gap:14px; }

    .composer { padding:16px; background:var(--sp-surface); }
    .composer-head { display:flex; gap:10px; align-items:center; margin-bottom:12px; }
    .content-input { background:transparent; border:none; outline:none; flex:1; color:var(--sp-ink); font-size:14px; padding:8px 10px; border-radius:6px; }
    .content-input::placeholder { color:var(--sp-ink-dim); }
    .avatar { width:38px; height:38px; border-radius:50%; background:var(--sp-teal-dim); color:var(--sp-teal); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:13px; flex-shrink:0; }
    .avatar.sm { width:34px; height:34px; font-size:12px; }

    .tip-fields { display:grid; grid-template-columns:repeat(auto-fit,minmax(110px,1fr)); gap:8px; margin-bottom:12px; }
    .tip-fields .small { width:100%; }
    .visibility-row { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
    .sebi-hint { font-size:11.5px; color:var(--sp-amber); flex:1; }

    .filters { display:flex; justify-content:flex-start; }

    .tip-card { padding:16px; background:var(--sp-surface); transition:all 0.15s; }
    .tip-card:hover { border:1px solid var(--sp-teal-dim); }
    .tip-card.locked { opacity:0.85; }

    .tip-head { display:flex; gap:10px; margin-bottom:10px; }
    .th-main { flex:1; min-width:0; }
    .name-row { display:flex; align-items:center; gap:7px; flex-wrap:wrap; }
    .name { color:var(--sp-ink); font-weight:600; font-size:14px; text-decoration:none; border-bottom:1px dotted var(--sp-ink-dim); }
    .handle { font-size:12px; color:var(--sp-ink-dim); }
    .meta-row { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-top:4px; font-size:11.5px; color:var(--sp-ink-dim); }
    .ticker { background:var(--sp-raised); padding:2px 7px; border-radius:3px; font-weight:700; color:var(--sp-ink); }
    .sentiment.bull { color:var(--sp-teal); } .sentiment.bear { color:var(--sp-red); } .sentiment.neutral { color:var(--sp-amber); }

    .chip { padding:1.5px 6px; border-radius:3px; font-size:10px; font-weight:700; letter-spacing:0.03em; }
    .chip.sebi { background:var(--sp-teal-dim); color:var(--sp-teal); }
    .chip.independent { background:rgba(245,158,11,0.15); color:var(--sp-amber); }
    .chip.premium { background:rgba(168,85,247,0.15); color:#c084fc; }

    .reason { color:var(--sp-ink-md); font-size:13px; line-height:1.55; margin:8px 0 12px; }
    .levels { display:grid; grid-template-columns:repeat(auto-fit,minmax(90px,1fr)); gap:10px; background:var(--sp-raised); border-radius:7px; padding:10px; }
    .levels div { display:flex; flex-direction:column; gap:2px; }
    .levels span { font-size:10px; color:var(--sp-ink-xs); text-transform:uppercase; letter-spacing:0.05em; }
    .levels b { font-size:14px; font-weight:700; }
    .up { color:var(--sp-teal); } .dn { color:var(--sp-red); }

    .locked-body { display:flex; gap:10px; align-items:center; background:var(--sp-raised); border-radius:7px; padding:14px; color:var(--sp-ink-md); font-size:13px; }
    .locked-body a { color:var(--sp-teal); font-weight:600; }

    .disclaimer { margin-top:10px; font-size:11.5px; color:var(--sp-amber); background:rgba(245,158,11,0.08); border-left:3px solid var(--sp-amber); padding:7px 10px; border-radius:3px; }

    .loading, .empty { text-align:center; padding:40px; color:var(--sp-ink-dim); font-size:13px; }
  `],
})
export class FeedComponent implements OnInit {
  private fb = inject(FormBuilder);
  private tipsApi = inject(TipsService);
  private auth = inject(AuthService);
  private realtime = inject(RealtimeService);
  private snack = inject(MatSnackBar);

  tickers = ['RELIANCE','TCS','HDFC','INFY','ITC','WIPRO','MARUTI','BAJFINANCE','NIFTY50','BANKNIFTY'];
  tips = signal<Tip[]>([]);
  loading = signal(false);
  typeFilter: TipType | null = null;

  canOfferPlan = this.auth.canOfferPlan;

  form = this.fb.nonNullable.group({
    content:   ['', [Validators.maxLength(280)]],
    ticker:    ['', Validators.required],
    tipType:   ['daily', Validators.required] as any,
    entry:     [null as number | null],
    target:    [null as number | null, Validators.required],
    sl:        [null as number | null],
    sentiment: ['bull', Validators.required] as any,
    horizon:   ['1D'],
    isPaid:    [false],
  });

  ngOnInit(): void {
    this.loadFeed();
    this.realtime.on<Tip>('feed:new-tip').subscribe(newTip => {
      this.tips.update(arr => [newTip, ...arr]);
    });
  }

  loadFeed(): void {
    this.loading.set(true);
    this.tipsApi.feed({ type: this.typeFilter ?? undefined, limit: 30 }).subscribe({
      next: res => { this.tips.set(res.data); this.loading.set(false); },
      error: () => { this.loading.set(false); this.snack.open('Failed to load feed', 'Close', { duration: 3000 }); },
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const horizon = v.tipType === 'daily' ? '1D' : v.tipType === 'swing' ? '1M' : '6M';
    this.tipsApi.create({
      ticker: v.ticker,
      tipType: v.tipType as any,
      entry: v.entry ?? undefined,
      target: v.target!,
      sl: v.sl ?? undefined,
      sentiment: v.sentiment as any,
      horizon,
      reason: v.content || undefined,
      isPaid: v.isPaid,
    }).subscribe({
      next: tip => {
        this.tips.update(arr => [tip, ...arr]);
        this.form.reset({ content: '', ticker: '', tipType: 'daily', entry: null, target: null, sl: null, sentiment: 'bull', horizon: '1D', isPaid: false });
        this.snack.open('Call published', 'Close', { duration: 2500, panelClass: 'snack-ok' });
      },
      error: err => this.snack.open(err.error?.message ?? 'Failed to publish', 'Close', { duration: 3500 }),
    });
  }

  initials(): string {
    const name = this.auth.user()?.name || '';
    return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
  }
  initialsOf(name?: string): string {
    return name ? name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() : '?';
  }
  timeAgo(ts: string): string {
    try { return formatDistanceToNow(new Date(ts), { addSuffix: true }); } catch { return ''; }
  }
}
