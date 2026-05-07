import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  selector: 'sp-login',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="auth-container">
      <mat-card class="auth-card">
        <div class="logo-section">
          <div class="logo">⚡</div>
          <h1>StockPulse</h1>
          <p class="tagline">SEBI-compliant stock analyst platform</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field appearance="outline" class="full">
            <mat-label>Email</mat-label>
            <input matInput formControlName="email" type="email" autocomplete="email">
            <mat-icon matPrefix>email</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full">
            <mat-label>Password</mat-label>
            <input matInput formControlName="password" [type]="showPassword() ? 'text' : 'password'" autocomplete="current-password">
            <mat-icon matPrefix>lock</mat-icon>
            <button matSuffix mat-icon-button type="button" (click)="showPassword.set(!showPassword())">
              <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
          </mat-form-field>

          @if (error()) { <div class="err">{{ error() }}</div> }

          <button mat-flat-button color="primary" class="full" [disabled]="form.invalid || loading()">
            @if (loading()) { <mat-spinner diameter="20"></mat-spinner> } @else { Sign In }
          </button>
        </form>

        <div class="divider">New to StockPulse?</div>
        <a mat-stroked-button class="full" routerLink="/auth/register">Create an account</a>
      </mat-card>
    </div>
  `,
  styles: [`
    .auth-container { min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px; background:var(--sp-canvas); }
    .auth-card { width:100%; max-width:420px; padding:32px; background:var(--sp-surface); }
    .logo-section { text-align:center; margin-bottom:28px; }
    .logo { font-size:48px; }
    h1 { margin:8px 0 4px; font-weight:700; font-size:26px; color:var(--sp-teal); }
    .tagline { color:var(--sp-ink-dim); font-size:13px; margin:0; }
    .full { width:100%; }
    .err { background:var(--sp-red-dim); color:var(--sp-red); padding:10px 14px; border-radius:6px; font-size:13px; margin-bottom:14px; }
    .divider { text-align:center; color:var(--sp-ink-dim); font-size:12px; margin:22px 0 14px; position:relative; }
    .divider::before, .divider::after { content:''; position:absolute; top:50%; width:30%; height:1px; background:var(--sp-line); }
    .divider::before { left:0; } .divider::after { right:0; }
  `],
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  loading = signal(false);
  showPassword = signal(false);
  error = signal<string | null>(null);

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: () => this.router.navigate(['/feed']),
      error: err => {
        this.error.set(err.error?.message ?? 'Login failed. Check your credentials.');
        this.loading.set(false);
      },
    });
  }
}
