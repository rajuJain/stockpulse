import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../core/services/auth.service';
import { UsersService, PlansService } from '../../core/services/api.services';
import { Plan } from '../../core/models';

@Component({
  standalone: true,
  selector: 'sp-profile',
  imports: [CommonModule, ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  template: `
    <div class="wrap">
      <mat-card class="head">
        <div class="avatar-lg">{{ initials() }}</div>
        <div class="h-info">
          <h2>{{ user()?.name }}</h2>
          <div class="handle">{{ user()?.handle }}</div>
          @if (user()?.sebiVerified) { <span class="chip sebi">✓ SEBI Verified</span> }
          @else if (user()?.sebi) { <span class="chip pending">SEBI Pending</span> }
          @else { <span class="chip ind">Independent</span> }
        </div>
      </mat-card>

      <!-- SEBI submission -->
      @if (!user()?.sebi) {
        <mat-card class="section">
          <h3>SEBI Registration</h3>
          <p class="info">Submit your SEBI RA registration number to unlock paid plans. Admin will verify within 24-48 hours.</p>
          <form [formGroup]="sebiForm" (ngSubmit)="submitSebi()">
            <mat-form-field appearance="outline" class="full">
              <mat-label>SEBI Reg Number (INH / INA / INP)</mat-label>
              <input matInput formControlName="regNo">
              <mat-hint>Format: INH000012345</mat-hint>
            </mat-form-field>
            <button mat-flat-button color="primary" [disabled]="sebiForm.invalid">Submit for Verification</button>
          </form>
        </mat-card>
      }

      <!-- Plan management -->
      @if (user()?.sebiVerified) {
        <mat-card class="section">
          <h3>{{ myPlan() ? 'My Plan' : 'Launch Your Plan' }}</h3>
          @if (myPlan()) {
            <div class="plan-stats">
              <div><b>{{ myPlan()!.subscriberCount }}</b><span>Subscribers</span></div>
              <div><b>₹{{ myPlan()!.totalRevenue | number }}</b><span>Total Revenue</span></div>
              <div><b>₹{{ myPlan()!.price }}</b><span>Per Month</span></div>
              <div><b>{{ myPlan()!.maxSubs - myPlan()!.subscriberCount }}</b><span>Slots Left</span></div>
            </div>
          } @else {
            <form [formGroup]="planForm" (ngSubmit)="createPlan()">
              <mat-form-field appearance="outline" class="full">
                <mat-label>Plan Name</mat-label>
                <input matInput formControlName="name">
              </mat-form-field>
              <div class="row">
                <mat-form-field appearance="outline">
                  <mat-label>Price (₹/mo)</mat-label>
                  <input matInput type="number" formControlName="price">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Max Subscribers</mat-label>
                  <input matInput type="number" formControlName="maxSubs">
                </mat-form-field>
              </div>
              <button mat-flat-button color="primary" [disabled]="planForm.invalid">Launch Plan</button>
            </form>
          }
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .wrap { padding:24px; max-width:800px; margin:0 auto; display:flex; flex-direction:column; gap:14px; }
    .head { display:flex; gap:18px; padding:24px; background:var(--sp-surface); }
    .avatar-lg { width:72px; height:72px; border-radius:50%; background:var(--sp-teal-dim); color:var(--sp-teal); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:26px; }
    h2 { margin:0; font-size:22px; }
    .handle { color:var(--sp-ink-dim); font-size:13px; margin:3px 0 10px; }
    .chip.sebi { background:var(--sp-teal-dim); color:var(--sp-teal); padding:3px 9px; border-radius:4px; font-size:11px; font-weight:700; }
    .chip.pending { background:rgba(245,158,11,0.15); color:var(--sp-amber); padding:3px 9px; border-radius:4px; font-size:11px; font-weight:700; }
    .chip.ind { background:var(--sp-raised); color:var(--sp-ink-dim); padding:3px 9px; border-radius:4px; font-size:11px; font-weight:600; }
    .section { padding:22px; background:var(--sp-surface); }
    .section h3 { margin:0 0 6px; font-size:16px; font-weight:700; }
    .info { color:var(--sp-ink-dim); font-size:13px; margin:0 0 14px; }
    .full { width:100%; }
    .row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .plan-stats { display:grid; grid-template-columns:repeat(auto-fit, minmax(120px, 1fr)); gap:14px; }
    .plan-stats div { display:flex; flex-direction:column; background:var(--sp-raised); padding:12px; border-radius:7px; }
    .plan-stats b { font-size:20px; color:var(--sp-teal); }
    .plan-stats span { font-size:11px; color:var(--sp-ink-dim); margin-top:2px; text-transform:uppercase; }
  `],
})
export class ProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authS = inject(AuthService);
  private usersApi = inject(UsersService);
  private plansApi = inject(PlansService);
  private snack = inject(MatSnackBar);

  user = this.authS.user;
  myPlan = signal<Plan | null>(null);

  sebiForm = this.fb.nonNullable.group({
    regNo: ['', [Validators.required, Validators.pattern(/^IN[HAP][A-Z0-9]{9,}$/)]],
  });

  planForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    price: [999, [Validators.required, Validators.min(99)]],
    maxSubs: [200, [Validators.required, Validators.min(10)]],
    focus: [['Daily Calls', 'Swing Trades']],
    perks: [['Daily premium calls', 'Entry/Target/SL levels', 'Priority support']],
  });

  ngOnInit(): void {
    if (this.user()?.sebiVerified) {
      this.plansApi.mine().subscribe({ next: p => this.myPlan.set(p), error: () => this.myPlan.set(null) });
    }
  }

  initials(): string {
    const name = this.user()?.name || '';
    return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
  }

  submitSebi(): void {
    const { regNo } = this.sebiForm.getRawValue();
    this.usersApi.submitSebi(regNo).subscribe({
      next: u => { this.authS.updateUser(u); this.snack.open('Submitted for verification', 'Close', { duration: 3000 }); },
      error: () => this.snack.open('Failed to submit', 'Close', { duration: 3000 }),
    });
  }

  createPlan(): void {
    const v = this.planForm.getRawValue();
    this.plansApi.create({ ...v, billingCycle: 'monthly' }).subscribe({
      next: p => { this.myPlan.set(p); this.snack.open('Plan launched!', 'Close', { duration: 3000 }); },
      error: err => this.snack.open(err.error?.message || 'Failed to launch plan', 'Close', { duration: 3500 }),
    });
  }
}
