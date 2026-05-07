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
  selector: 'sp-register',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="auth-container">
      <mat-card class="auth-card">
        <div class="logo-section">
          <div class="logo">⚡</div>
          <h1>Create Account</h1>
          <p class="tagline">Join India's SEBI-compliant analyst community</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field appearance="outline" class="full">
            <mat-label>Full Name</mat-label>
            <input matInput formControlName="name" autocomplete="name">
          </mat-form-field>
          <mat-form-field appearance="outline" class="full">
            <mat-label>Handle (e.g. @yourname)</mat-label>
            <input matInput formControlName="handle" autocomplete="username">
          </mat-form-field>
          <mat-form-field appearance="outline" class="full">
            <mat-label>Email</mat-label>
            <input matInput formControlName="email" type="email" autocomplete="email">
          </mat-form-field>
          <mat-form-field appearance="outline" class="full">
            <mat-label>Phone (optional)</mat-label>
            <input matInput formControlName="phone" autocomplete="tel">
          </mat-form-field>
          <mat-form-field appearance="outline" class="full">
            <mat-label>Password</mat-label>
            <input matInput formControlName="password" [type]="showPassword() ? 'text' : 'password'" autocomplete="new-password">
            <button matSuffix mat-icon-button type="button" (click)="showPassword.set(!showPassword())">
              <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
            <mat-hint>Minimum 8 characters</mat-hint>
          </mat-form-field>

          @if (error()) { <div class="err">{{ error() }}</div> }

          <button mat-flat-button color="primary" class="full" [disabled]="form.invalid || loading()">
            @if (loading()) { <mat-spinner diameter="20"></mat-spinner> } @else { Create Account }
          </button>
        </form>

        <div class="divider">Already have an account?</div>
        <a mat-stroked-button class="full" routerLink="/auth/login">Sign in</a>
      </mat-card>
    </div>
  `,
  styles: [`
    .auth-container { min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px; background:var(--sp-canvas); }
    .auth-card { width:100%; max-width:460px; padding:32px; background:var(--sp-surface); }
    .logo-section { text-align:center; margin-bottom:22px; }
    .logo { font-size:40px; }
    h1 { margin:8px 0 4px; font-weight:700; font-size:22px; color:var(--sp-teal); }
    .tagline { color:var(--sp-ink-dim); font-size:12px; margin:0; }
    .full { width:100%; }
    .err { background:var(--sp-red-dim); color:var(--sp-red); padding:10px 14px; border-radius:6px; font-size:13px; margin-bottom:14px; }
    .divider { text-align:center; color:var(--sp-ink-dim); font-size:12px; margin:22px 0 14px; position:relative; }
    .divider::before, .divider::after { content:''; position:absolute; top:50%; width:30%; height:1px; background:var(--sp-line); }
    .divider::before { left:0; } .divider::after { right:0; }
  `],
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  form = this.fb.nonNullable.group({
    name:    ['', [Validators.required, Validators.maxLength(120)]],
    handle:  ['', [Validators.required, Validators.pattern(/^@?[a-zA-Z0-9_]+$/)]],
    email:   ['', [Validators.required, Validators.email]],
    phone:   [''],
    password:['', [Validators.required, Validators.minLength(8)]],
  });

  loading = signal(false);
  showPassword = signal(false);
  error = signal<string | null>(null);

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);
    const v = this.form.getRawValue();
    this.auth.register({
      name: v.name, handle: v.handle, email: v.email, password: v.password,
      phone: v.phone || undefined,
    }).subscribe({
      next: () => this.router.navigate(['/feed']),
      error: err => {
        this.error.set(err.error?.message ?? 'Registration failed');
        this.loading.set(false);
      },
    });
  }
}
