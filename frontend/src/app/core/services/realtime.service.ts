import { Injectable, inject, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Subject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class RealtimeService implements OnDestroy {
  private auth = inject(AuthService);
  private socket: Socket | null = null;
  private readonly events$ = new Subject<{ event: string; payload: any }>();

  connect(): void {
    if (this.socket?.connected) return;
    const token = this.auth.accessToken();
    if (!token) return;
    this.socket = io(environment.wsUrl, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
    });

    // Re-emit all events onto the Subject
    this.socket.onAny((event, payload) => this.events$.next({ event, payload }));
  }

  disconnect(): void { this.socket?.disconnect(); this.socket = null; }

  on<T = any>(event: string): Observable<T> {
    return new Observable<T>(subscriber => {
      const sub = this.events$.subscribe(e => {
        if (e.event === event) subscriber.next(e.payload as T);
      });
      return () => sub.unsubscribe();
    });
  }

  watchTicker(ticker: string):   void { this.socket?.emit('watch:ticker', ticker); }
  unwatchTicker(ticker: string): void { this.socket?.emit('unwatch:ticker', ticker); }
  watchAnalyst(analystId: number): void { this.socket?.emit('watch:analyst', analystId); }

  ngOnDestroy(): void { this.disconnect(); }
}
