import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { formatDistanceToNow } from 'date-fns';
import { TipsService, UsersService } from '../../core/services/api.services';
import { User, Tip, AnalystStats } from '../../core/models';

@Component({
  standalone: true,
  selector: 'sp-analyst-profile',
  imports: [CommonModule, RouterLink, MatCardModule, MatTabsModule, MatButtonModule, MatChipsModule, MatIconModule],
  template: `
    @if (user()) {
      <div class="wrap">
        <mat-card class="profile-head">
          <div class="avatar-lg">{{ initials() }}</div>
          <div class="h-info">
            <h2>
              {{ user()!.name }}
              @if (user()!.sebiVerified) { <span class="chip sebi">✓ SEBI</span> }
              @if (user()!.regNo) { <span class="chip reg">{{ user()!.regNo }}</span> }
            </h2>
            <div class="handle">{{ user()!.handle }}</div>
            @if (user()!.bio) { <p class="bio">{{ user()!.bio }}</p> }
            <div class="quickstats">
              <div><b>{{ stats()?.overallAccuracy ?? '—' }}%</b><span>Accuracy</span></div>
              <div><b>{{ stats()?.freeAccuracy ?? '—' }}%</b><span>Free Tips</span></div>
              <div><b>{{ stats()?.total ?? 0 }}</b><span>Total Calls</span></div>
              <div><b>{{ user()!.followersCount }}</b><span>Followers</span></div>
              <div><b>{{ user()!.streak }}</b><span>Streak</span></div>
            </div>
          </div>
        </mat-card>

        <mat-tab-group>
          <!-- Accuracy -->
          <mat-tab label="Accuracy Overview">
            <div class="tab-content">
              <div class="accuracy-grid">
                <mat-card class="big-stat">
                  <div class="lbl">Overall Accuracy</div>
                  <div class="big">{{ stats()?.overallAccuracy ?? 0 }}%</div>
                  <div class="sub">{{ stats()?.wins ?? 0 }} wins · {{ (stats()?.resolved ?? 0) - (stats()?.wins ?? 0) }} losses</div>
                </mat-card>
                <mat-card class="big-stat">
                  <div class="lbl">Free Tip Accuracy</div>
                  <div class="big">{{ stats()?.freeAccuracy ?? 0 }}%</div>
                  <div class="sub">Based on {{ stats()?.free ?? 0 }} free tips</div>
                </mat-card>
              </div>

              @if (stats()?.byType) {
                <mat-card class="by-type">
                  <div class="lbl">Accuracy by Call Type</div>
                  @for (type of ['daily','swing','longterm']; track type) {
                    <div class="type-row">
                      <div class="tr-head">
                        <span>{{ type === 'daily' ? '⚡ Daily' : type === 'swing' ? '📈 Swing' : '🏛 Long-Term' }}</span>
                        <b>{{ stats()!.byType[type].accuracy ?? 0 }}%</b>
                      </div>
                      <div class="tr-bar"><div class="tr-fill" [style.width.%]="stats()!.byType[type].accuracy ?? 0"></div></div>
                      <div class="tr-sub">{{ stats()!.byType[type].wins }} / {{ stats()!.byType[type].total }} wins</div>
                    </div>
                  }
                </mat-card>
              }
            </div>
          </mat-tab>

          <!-- Free Tips -->
          <mat-tab label="Free Tips">
            <div class="tab-content">
              @for (tip of freeTips(); track tip.id) {
                <mat-card class="tip-row">
                  <div class="tr-head">
                    <span class="ticker">{{ tip.ticker }}</span>
                    <span class="type">{{ tip.tipType }}</span>
                    <span class="sentiment" [class]="tip.sentiment">{{ tip.sentiment }}</span>
                    @if (tip.status !== 'open') {
                      <span class="status" [class]="tip.result">{{ tip.result }}</span>
                    }
                    <span class="time">{{ timeAgo(tip.createdAt) }}</span>
                  </div>
                  <div class="levels">
                    <div><span>Entry</span><b>₹{{ tip.entry }}</b></div>
                    <div><span>Target</span><b class="up">₹{{ tip.target }}</b></div>
                    @if (tip.sl) { <div><span>SL</span><b class="dn">₹{{ tip.sl }}</b></div> }
                    @if (tip.exitPrice) { <div><span>Exit</span><b>₹{{ tip.exitPrice }}</b></div> }
                  </div>
                  @if (tip.reason) { <p class="reason">{{ tip.reason }}</p> }
                </mat-card>
              }
              @if (freeTips().length === 0) { <div class="empty">No free tips yet.</div> }
            </div>
          </mat-tab>

          <!-- Resolved -->
          <mat-tab label="All Resolved">
            <div class="tab-content">
              @for (tip of resolved(); track tip.id) {
                <mat-card class="tip-row" [class.win]="tip.result === 'win'" [class.loss]="tip.result === 'loss'">
                  <div class="tr-head">
                    <span class="ticker">{{ tip.ticker }}</span>
                    <span class="type">{{ tip.tipType }}</span>
                    <span class="status" [class]="tip.result">{{ tip.result | uppercase }}</span>
                    @if (tip.isPaid) { <span class="chip premium">PREMIUM</span> }
                  </div>
                  <div class="levels">
                    <div><span>Entry</span><b>₹{{ tip.entry }}</b></div>
                    <div><span>Target</span><b>₹{{ tip.target }}</b></div>
                    <div><span>SL</span><b>₹{{ tip.sl }}</b></div>
                    <div><span>Exit</span><b [class.up]="tip.result === 'win'" [class.dn]="tip.result === 'loss'">₹{{ tip.exitPrice }}</b></div>
                  </div>
                </mat-card>
              }
              @if (resolved().length === 0) { <div class="empty">No resolved tips yet.</div> }
            </div>
          </mat-tab>
        </mat-tab-group>
      </div>
    }
  `,
  styles: [`
    .wrap { padding:20px; max-width:1100px; margin:0 auto; }
    .profile-head { display:flex; gap:20px; padding:24px; margin-bottom:16px; background:var(--sp-surface); }
    .avatar-lg { width:84px; height:84px; border-radius:50%; background:var(--sp-teal-dim); color:var(--sp-teal); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:28px; }
    .h-info { flex:1; }
    .h-info h2 { margin:0; font-size:22px; display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
    .chip.sebi { background:var(--sp-teal-dim); color:var(--sp-teal); padding:2px 7px; border-radius:3px; font-size:11px; font-weight:700; }
    .chip.reg { background:var(--sp-raised); color:var(--sp-ink-dim); padding:2px 7px; border-radius:3px; font-size:10px; font-family:monospace; }
    .chip.premium { background:rgba(168,85,247,0.15); color:#c084fc; padding:1.5px 6px; border-radius:3px; font-size:10px; font-weight:700; }
    .handle { color:var(--sp-ink-dim); font-size:13px; margin-top:4px; }
    .bio { color:var(--sp-ink-md); margin:10px 0 14px; font-size:13px; line-height:1.5; }
    .quickstats { display:flex; gap:24px; flex-wrap:wrap; }
    .quickstats div { display:flex; flex-direction:column; }
    .quickstats b { font-size:20px; color:var(--sp-teal); font-weight:700; }
    .quickstats span { font-size:11px; color:var(--sp-ink-dim); text-transform:uppercase; letter-spacing:0.05em; }

    .tab-content { padding:20px 0; display:flex; flex-direction:column; gap:12px; }

    .accuracy-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:12px; }
    .big-stat { padding:20px; background:var(--sp-raised); }
    .lbl { font-size:10px; font-weight:700; letter-spacing:0.07em; text-transform:uppercase; color:var(--sp-ink-xs); margin-bottom:8px; }
    .big { font-size:40px; font-weight:800; color:var(--sp-teal); line-height:1; }
    .big-stat .sub { font-size:12px; color:var(--sp-ink-dim); margin-top:4px; }

    .by-type { padding:18px; background:var(--sp-raised); }
    .type-row { padding:12px 0; border-bottom:1px solid var(--sp-line); }
    .type-row:last-child { border-bottom:none; }
    .tr-head { display:flex; justify-content:space-between; font-weight:600; font-size:13px; margin-bottom:6px; }
    .tr-head b { color:var(--sp-teal); }
    .tr-bar { height:6px; background:var(--sp-line); border-radius:3px; overflow:hidden; }
    .tr-fill { height:100%; background:var(--sp-teal); transition:width 0.3s; }
    .tr-sub { font-size:11px; color:var(--sp-ink-dim); margin-top:4px; }

    .tip-row { padding:14px 16px; background:var(--sp-surface); }
    .tip-row.win { border-left:3px solid var(--sp-teal); }
    .tip-row.loss { border-left:3px solid var(--sp-red); }
    .tip-row .tr-head { display:flex; align-items:center; gap:10px; flex-wrap:wrap; font-size:13px; }
    .ticker { background:var(--sp-raised); padding:2px 7px; border-radius:3px; font-weight:700; }
    .type { color:var(--sp-ink-dim); font-size:11.5px; }
    .sentiment.bull { color:var(--sp-teal); }  .sentiment.bear { color:var(--sp-red); }  .sentiment.neutral { color:var(--sp-amber); }
    .status.win { color:var(--sp-teal); font-weight:700; font-size:11px; }
    .status.loss { color:var(--sp-red); font-weight:700; font-size:11px; }
    .time { color:var(--sp-ink-dim); font-size:11px; margin-left:auto; }
    .levels { display:grid; grid-template-columns:repeat(auto-fit, minmax(90px, 1fr)); gap:10px; background:var(--sp-raised); border-radius:6px; padding:10px; margin-top:10px; }
    .levels div { display:flex; flex-direction:column; gap:2px; }
    .levels span { font-size:10px; color:var(--sp-ink-xs); text-transform:uppercase; }
    .levels b { font-weight:700; font-size:13px; }
    .up { color:var(--sp-teal); } .dn { color:var(--sp-red); }
    .reason { margin:8px 0 0; color:var(--sp-ink-md); font-size:13px; line-height:1.5; font-style:italic; }

    .empty { text-align:center; padding:40px; color:var(--sp-ink-dim); font-size:13px; }
  `],
})
export class AnalystProfileComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private usersApi = inject(UsersService);
  private tipsApi = inject(TipsService);

  user = signal<User | null>(null);
  stats = signal<AnalystStats | null>(null);
  freeTips = signal<Tip[]>([]);
  resolved = signal<Tip[]>([]);

  ngOnInit(): void {
    this.route.params.subscribe(p => {
      const id = +p['id'];
      this.usersApi.findOne(id).subscribe(u => this.user.set(u));
      this.tipsApi.analystStats(id).subscribe(s => this.stats.set(s));
      this.tipsApi.analystFreeTips(id).subscribe(t => this.freeTips.set(t));
      this.tipsApi.analystResolved(id).subscribe(t => this.resolved.set(t));
    });
  }

  initials(): string {
    const name = this.user()?.name || '';
    return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
  }
  timeAgo(ts: string): string {
    try { return formatDistanceToNow(new Date(ts), { addSuffix: true }); } catch { return ''; }
  }
}
