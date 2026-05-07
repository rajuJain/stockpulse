import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Tip, TipType, Plan, Subscription, CrowdTarget, AnalystStats,
  User, Stock, FullAnalysis,
} from '../models';

// ── Tips ───────────────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class TipsService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/tips`;

  create(dto: Partial<Tip>): Observable<Tip> { return this.http.post<Tip>(this.base, dto); }

  feed(params: { type?: TipType; ticker?: string; page?: number; limit?: number } = {}): Observable<{ data: Tip[]; page: number; limit: number; total: number; hasMore: boolean }> {
    let httpParams = new HttpParams();
    if (params.type)   httpParams = httpParams.set('type', params.type);
    if (params.ticker) httpParams = httpParams.set('ticker', params.ticker);
    if (params.page)   httpParams = httpParams.set('page', params.page);
    if (params.limit)  httpParams = httpParams.set('limit', params.limit);
    return this.http.get<any>(`${this.base}/feed`, { params: httpParams });
  }

  crowdTargets(type?: TipType): Observable<CrowdTarget[]> {
    let params = new HttpParams();
    if (type) params = params.set('type', type);
    return this.http.get<CrowdTarget[]>(`${this.base}/crowd-targets`, { params });
  }

  analystFreeTips(analystId: number): Observable<Tip[]> {
    return this.http.get<Tip[]>(`${this.base}/analyst/${analystId}/free`);
  }
  analystResolved(analystId: number): Observable<Tip[]> {
    return this.http.get<Tip[]>(`${this.base}/analyst/${analystId}/resolved`);
  }
  analystStats(analystId: number): Observable<AnalystStats> {
    return this.http.get<AnalystStats>(`${this.base}/analyst/${analystId}/stats`);
  }

  closeTip(id: number, dto: { status: string; result: string; exitPrice: number }): Observable<Tip> {
    return this.http.patch<Tip>(`${this.base}/${id}/close`, dto);
  }
}

// ── Posts ──────────────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class PostsService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/posts`;

  feed(page = 1, limit = 20): Observable<any> {
    return this.http.get<any>(`${this.base}/feed`, { params: new HttpParams().set('page', page).set('limit', limit) });
  }
  create(content: string, tipId?: number): Observable<any> {
    return this.http.post(this.base, { content, tipId });
  }
  like(id: number): Observable<{ liked: boolean }> {
    return this.http.post<{ liked: boolean }>(`${this.base}/${id}/like`, {});
  }
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}

// ── Plans ──────────────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class PlansService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/plans`;

  findAll():   Observable<Plan[]>  { return this.http.get<Plan[]>(this.base); }
  mine():      Observable<Plan>    { return this.http.get<Plan>(`${this.base}/mine`); }
  findOne(id: number): Observable<Plan> { return this.http.get<Plan>(`${this.base}/${id}`); }
  create(dto: Partial<Plan>): Observable<Plan>  { return this.http.post<Plan>(this.base, dto); }
  update(dto: Partial<Plan>): Observable<Plan>  { return this.http.patch<Plan>(this.base, dto); }
  deactivate(): Observable<void>   { return this.http.delete<void>(this.base); }
}

// ── Subscriptions ──────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class SubscriptionsService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/subscriptions`;

  subscribe(planId: number): Observable<Subscription> {
    return this.http.post<Subscription>(this.base, { planId });
  }
  mine(): Observable<Subscription[]> { return this.http.get<Subscription[]>(`${this.base}/mine`); }
  cancel(id: number): Observable<void> { return this.http.delete<void>(`${this.base}/${id}`); }
}

// ── Analysis ───────────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class AnalysisService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/analysis`;

  listStocks():                     Observable<Stock[]>        { return this.http.get<Stock[]>(`${this.base}/stocks`); }
  fullAnalysis(ticker: string):     Observable<FullAnalysis>   { return this.http.get<FullAnalysis>(`${this.base}/${ticker}`); }
  prices(ticker: string, days=90):  Observable<any[]>          { return this.http.get<any[]>(`${this.base}/${ticker}/prices`, { params: new HttpParams().set('days', days) }); }
  technical(ticker: string):        Observable<any>            { return this.http.get<any>(`${this.base}/${ticker}/technical`); }
  fundamental(ticker: string):      Observable<any>            { return this.http.get<any>(`${this.base}/${ticker}/fundamental`); }
  shareholding(ticker: string):     Observable<any[]>          { return this.http.get<any[]>(`${this.base}/${ticker}/shareholding`); }
  quarters(ticker: string):         Observable<any[]>          { return this.http.get<any[]>(`${this.base}/${ticker}/quarters`); }
}

// ── Watchlist ──────────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class WatchlistService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/watchlist`;

  list(): Observable<any[]> { return this.http.get<any[]>(this.base); }
  add(ticker: string): Observable<any> { return this.http.post(`${this.base}/${ticker}`, {}); }
  remove(ticker: string): Observable<void> { return this.http.delete<void>(`${this.base}/${ticker}`); }
}

// ── Users ──────────────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class UsersService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/users`;

  leaderboard():   Observable<User[]> { return this.http.get<User[]>(`${this.base}/leaderboard`); }
  findOne(id: number): Observable<User> { return this.http.get<User>(`${this.base}/${id}`); }
  updateProfile(dto: Partial<User>): Observable<User> { return this.http.patch<User>(`${this.base}/me`, dto); }
  submitSebi(regNo: string): Observable<User> { return this.http.patch<User>(`${this.base}/me/sebi`, { regNo }); }
}

// ── Admin ──────────────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/admin`;

  overview():     Observable<any>   { return this.http.get<any>(`${this.base}/overview`); }
  users(q: { status?: string; sebi?: string; search?: string } = {}): Observable<User[]> {
    let p = new HttpParams();
    if (q.status) p = p.set('status', q.status);
    if (q.sebi)   p = p.set('sebi', q.sebi);
    if (q.search) p = p.set('search', q.search);
    return this.http.get<User[]>(`${this.base}/users`, { params: p });
  }
  sebiQueue():    Observable<User[]> { return this.http.get<User[]>(`${this.base}/sebi-queue`); }
  approveSebi(id: number): Observable<User> { return this.http.post<User>(`${this.base}/sebi/${id}/approve`, {}); }
  rejectSebi(id: number):  Observable<User> { return this.http.post<User>(`${this.base}/sebi/${id}/reject`, {}); }
  suspend(id: number):     Observable<User> { return this.http.post<User>(`${this.base}/users/${id}/suspend`, {}); }
  unsuspend(id: number):   Observable<User> { return this.http.post<User>(`${this.base}/users/${id}/unsuspend`, {}); }
  plans():        Observable<Plan[]> { return this.http.get<Plan[]>(`${this.base}/plans`); }
  deactivatePlan(userId: number): Observable<void> { return this.http.delete<void>(`${this.base}/plans/${userId}`); }
  tipsByType():   Observable<{ type: string; count: string }[]> { return this.http.get<any>(`${this.base}/analytics/tips-by-type`); }
  revenueByAnalyst(): Observable<any[]> { return this.http.get<any[]>(`${this.base}/analytics/revenue-by-analyst`); }
}

// ── Payments ───────────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class PaymentsService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/payments`;

  createOrder(planId: number): Observable<{ orderId: string; amount: number; currency: string; key: string }> {
    return this.http.post<any>(`${this.base}/order`, { planId });
  }
  verify(dto: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }): Observable<any> {
    return this.http.post<any>(`${this.base}/verify`, dto);
  }
}
