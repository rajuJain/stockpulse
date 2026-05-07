import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, User } from '../models';

const STORAGE_KEY = 'stockpulse_auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly _user = signal<User | null>(this.loadUser());
  private readonly _accessToken = signal<string | null>(this.loadAccessToken());

  readonly user = this._user.asReadonly();
  readonly accessToken = this._accessToken.asReadonly();
  readonly isAuthenticated = computed(() => !!this._user() && !!this._accessToken());
  readonly isAdmin = computed(() => this._user()?.role === 'admin');
  readonly isSebiVerified = computed(() => !!this._user()?.sebiVerified);
  readonly canOfferPlan = computed(() => {
    const u = this._user();
    return !!u?.sebi && !!u?.sebiVerified && u?.status === 'active';
  });

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(tap(r => this.persist(r)));
  }

  register(dto: { name: string; handle: string; email: string; password: string; phone?: string; }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/register`, dto)
      .pipe(tap(r => this.persist(r)));
  }

  refresh(refreshToken: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/refresh`, { refreshToken })
      .pipe(tap(r => this.persist(r)));
  }

  logout(): void {
    const refreshToken = this.loadRefreshToken();
    if (refreshToken) {
      this.http.post(`${environment.apiUrl}/auth/logout`, { refreshToken }).subscribe({ error: () => {} });
    }
    localStorage.removeItem(STORAGE_KEY);
    this._user.set(null);
    this._accessToken.set(null);
    this.router.navigate(['/auth/login']);
  }

  fetchMe(): Observable<User> {
    return this.http.get<User>(`${environment.apiUrl}/auth/me`)
      .pipe(tap(user => this.updateUser(user)));
  }

  updateUser(user: User): void {
    this._user.set(user);
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...stored, user }));
  }

  loadRefreshToken(): string | null {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored).refreshToken : null;
  }

  private persist(response: AuthResponse): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(response));
    this._user.set(response.user);
    this._accessToken.set(response.accessToken);
  }

  private loadUser(): User | null {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored).user : null;
  }

  private loadAccessToken(): string | null {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored).accessToken : null;
  }
}
