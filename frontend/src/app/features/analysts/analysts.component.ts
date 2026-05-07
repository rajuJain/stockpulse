import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PlansService, SubscriptionsService } from '../../core/services/api.services';
import { AuthService } from '../../core/services/auth.service';
import { Plan } from '../../core/models';

@Component({
  standalone: true,
  selector: 'sp-analysts',
  imports: [CommonModule, RouterLink, MatCardModule, MatButtonModule, MatChipsModule, MatIconModule],
  template: `
    <div class="wrap">
      <h2>Analysts & Plans</h2>
      <p class="sub">Subscribe to SEBI-verified analysts for premium calls and research.</p>

      <div class="grid">
        @for (plan of plans(); track plan.id) {
          <mat-card class="plan-card">
            <div class="plan-head">
              <div class="avatar">{{ initialsOf(plan.user?.name) }}</div>
              <div>
                <div class="name">
                  <a [routerLink]="['/analysts', plan.userId]">{{ plan.user?.name }}</a>
                  @if (plan.user?.sebiVerified) { <span class="chip sebi">✓ SEBI</span> }
                </div>
                <div class="handle">{{ plan.user?.handle }} · {{ plan.user?.accuracy }}% accuracy</div>
              </div>
            </div>

            <div class="plan-name">{{ plan.name }}</div>
            <div class="price">₹{{ plan.price | number }}<span>/mo</span></div>

            @if (plan.focus?.length) {
              <div class="focus">
                @for (f of plan.focus; track f) { <mat-chip>{{ f }}</mat-chip> }
              </div>
            }

            @if (plan.perks?.length) {
              <ul class="perks">
                @for (p of plan.perks.slice(0,3); track p) { <li>✓ {{ p }}</li> }
              </ul>
            }

            <div class="slots">
              <div class="slot-bar"><div class="slot-fill" [style.width.%]="(plan.subscriberCount/plan.maxSubs)*100"></div></div>
              <span class="slot-text">{{ plan.subscriberCount }}/{{ plan.maxSubs }} subscribers · {{ plan.maxSubs - plan.subscriberCount }} slots left</span>
            </div>

            <div class="actions">
              <button mat-flat-button color="primary" (click)="subscribe(plan)">Subscribe</button>
              <a mat-stroked-button [routerLink]="['/analysts', plan.userId]">View Profile</a>
            </div>
          </mat-card>
        }
      </div>

      @if (plans().length === 0) { <div class="empty">No active plans yet.</div> }
    </div>
  `,
  styles: [`
    .wrap { padding:24px; max-width:1200px; margin:0 auto; }
    h2 { margin:0 0 4px; font-size:22px; font-weight:700; }
    .sub { color:var(--sp-ink-dim); margin:0 0 24px; font-size:13px; }
    .grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:16px; }
    .plan-card { padding:18px; background:var(--sp-surface); transition:all 0.15s; }
    .plan-card:hover { border:1px solid var(--sp-teal-dim); transform:translateY(-2px); }
    .plan-head { display:flex; gap:10px; margin-bottom:14px; }
    .avatar { width:42px; height:42px; border-radius:50%; background:var(--sp-teal-dim); color:var(--sp-teal); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:14px; }
    .name { display:flex; align-items:center; gap:7px; font-weight:600; font-size:14px; }
    .name a { color:var(--sp-ink); text-decoration:none; border-bottom:1px dotted var(--sp-ink-dim); }
    .chip.sebi { background:var(--sp-teal-dim); color:var(--sp-teal); padding:1.5px 6px; border-radius:3px; font-size:10px; font-weight:700; }
    .handle { font-size:11.5px; color:var(--sp-ink-dim); margin-top:2px; }
    .plan-name { font-weight:700; font-size:15px; margin:10px 0 2px; }
    .price { font-size:26px; font-weight:800; color:var(--sp-teal); margin-bottom:10px; }
    .price span { font-size:13px; color:var(--sp-ink-dim); font-weight:400; }
    .focus { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:10px; }
    .perks { list-style:none; padding:0; margin:0 0 12px; }
    .perks li { font-size:12px; color:var(--sp-ink-md); padding:3px 0; }
    .slots { margin:10px 0; }
    .slot-bar { height:4px; background:var(--sp-line); border-radius:3px; margin-bottom:4px; overflow:hidden; }
    .slot-fill { height:100%; background:linear-gradient(90deg, var(--sp-teal), #60A5FA); }
    .slot-text { font-size:11px; color:var(--sp-ink-dim); }
    .actions { display:flex; gap:8px; margin-top:12px; }
    .empty { text-align:center; padding:50px; color:var(--sp-ink-dim); }
  `],
})
export class AnalystsComponent implements OnInit {
  private plansApi = inject(PlansService);
  private subsApi = inject(SubscriptionsService);
  private snack = inject(MatSnackBar);
  private router = inject(Router);

  plans = signal<Plan[]>([]);

  ngOnInit(): void {
    this.plansApi.findAll().subscribe(p => this.plans.set(p));
  }

  subscribe(plan: Plan): void {
    this.subsApi.subscribe(plan.id).subscribe({
      next: () => this.snack.open(`Subscribed to ${plan.user?.name}`, 'Close', { duration: 2500 }),
      error: err => this.snack.open(err.error?.message || 'Subscription failed', 'Close', { duration: 3500 }),
    });
  }

  initialsOf(name?: string): string {
    return name ? name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() : '?';
  }
}
