import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../core/services/auth.service';
import { RealtimeService } from '../../core/services/realtime.service';

@Component({
  standalone: true,
  selector: 'sp-shell',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, MatIconModule, MatButtonModule, MatMenuModule, MatBadgeModule, MatTooltipModule],
  template: `
    <div class="shell" [class.sidebar-collapsed]="sidebarCollapsed()">
      <!-- Left Sidebar -->
      <aside class="sidebar">
        <div class="brand">
          <span class="logo">⚡</span>
          @if (!sidebarCollapsed()) { <span class="brand-name">StockPulse</span> }
          <button mat-icon-button class="collapse-btn" (click)="sidebarCollapsed.set(!sidebarCollapsed())">
            <mat-icon>{{ sidebarCollapsed() ? 'chevron_right' : 'chevron_left' }}</mat-icon>
          </button>
        </div>

        @if (!sidebarCollapsed()) {
          <div class="user-pill">
            <div class="avatar">{{ initials() }}</div>
            <div class="u-info">
              <div class="u-name">{{ user()?.name }}</div>
              <div class="u-handle">
                {{ user()?.handle }}
                @if (user()?.sebiVerified) { <span class="sebi-chip">✓ SEBI</span> }
              </div>
            </div>
          </div>
        }

        <nav>
          @for (item of navItems; track item.path) {
            <a [routerLink]="item.path" routerLinkActive="active"
               [matTooltip]="sidebarCollapsed() ? item.label : ''" matTooltipPosition="right">
              <mat-icon>{{ item.icon }}</mat-icon>
              @if (!sidebarCollapsed()) { <span>{{ item.label }}</span> }
            </a>
          }
          @if (isAdmin()) {
            <a routerLink="/admin" routerLinkActive="active" class="admin"
               [matTooltip]="sidebarCollapsed() ? 'Admin' : ''" matTooltipPosition="right">
              <mat-icon>admin_panel_settings</mat-icon>
              @if (!sidebarCollapsed()) { <span>Admin</span> }
            </a>
          }
        </nav>

        @if (!sidebarCollapsed()) {
          <div class="market-bar">
            <div class="mb-label">MARKETS</div>
            <div class="mb-row"><span>NIFTY 50</span><span class="up">22,480 +0.3%</span></div>
            <div class="mb-row"><span>SENSEX</span><span class="up">73,912 +0.4%</span></div>
            <div class="mb-row"><span>BANKNIFTY</span><span class="up">47,320 +0.6%</span></div>
          </div>
        }
      </aside>

      <!-- Main -->
      <main class="main">
        <header class="topbar">
          <div class="nse-open">
            <span class="pulse"></span> NSE Open · {{ today }}
          </div>
          <div class="actions">
            <button mat-icon-button [matMenuTriggerFor]="notifMenu">
              <mat-icon [matBadge]="unread()" matBadgeColor="warn" [matBadgeHidden]="unread() === 0">notifications</mat-icon>
            </button>
            <button mat-button [matMenuTriggerFor]="userMenu">
              <div class="avatar sm">{{ initials() }}</div>
              <span>{{ user()?.name }}</span>
            </button>
          </div>
        </header>

        <div class="content"><router-outlet></router-outlet></div>
      </main>

      <mat-menu #notifMenu="matMenu">
        <div style="padding:14px 18px; font-size:13px;">No new notifications</div>
      </mat-menu>

      <mat-menu #userMenu="matMenu">
        <a mat-menu-item routerLink="/profile">
          <mat-icon>person</mat-icon><span>My Profile</span>
        </a>
        <button mat-menu-item (click)="logout()">
          <mat-icon>logout</mat-icon><span>Sign Out</span>
        </button>
      </mat-menu>
    </div>
  `,
  styles: [`
    .shell { display:flex; height:100vh; background:var(--sp-canvas); color:var(--sp-ink); }
    .sidebar { width:232px; background:var(--sp-surface); border-right:1px solid var(--sp-line); display:flex; flex-direction:column; transition:width 220ms cubic-bezier(.4,0,.2,1); }
    .sidebar-collapsed .sidebar { width:64px; }

    .brand { display:flex; align-items:center; gap:10px; padding:18px 16px; border-bottom:1px solid var(--sp-line); }
    .logo { font-size:22px; }
    .brand-name { font-weight:700; font-size:17px; color:var(--sp-teal); letter-spacing:-0.01em; }
    .collapse-btn { margin-left:auto; }

    .user-pill { display:flex; gap:10px; padding:14px 16px; border-bottom:1px solid var(--sp-line); }
    .avatar { width:36px; height:36px; border-radius:50%; background:var(--sp-teal-dim); color:var(--sp-teal); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:13px; flex-shrink:0; }
    .avatar.sm { width:26px; height:26px; font-size:11px; margin-right:8px; }
    .u-info { flex:1; min-width:0; }
    .u-name { font-weight:600; font-size:13px; text-overflow:ellipsis; white-space:nowrap; overflow:hidden; }
    .u-handle { font-size:11px; color:var(--sp-ink-dim); }
    .sebi-chip { background:var(--sp-teal-dim); color:var(--sp-teal); padding:1px 5px; border-radius:3px; font-weight:700; margin-left:4px; }

    nav { flex:1; padding:12px 10px; display:flex; flex-direction:column; gap:2px; overflow-y:auto; }
    nav a { display:flex; align-items:center; gap:12px; padding:10px 12px; color:var(--sp-ink-dim); border-radius:7px; text-decoration:none; font-size:13.5px; font-weight:500; transition:all 0.1s; }
    nav a:hover { background:var(--sp-raised); color:var(--sp-ink); }
    nav a.active { background:var(--sp-teal-dim); color:var(--sp-teal); font-weight:600; }
    nav a.admin { margin-top:auto; color:var(--sp-amber); }
    nav a.admin.active { background:rgba(245,158,11,0.1); }

    .market-bar { padding:12px 16px; border-top:1px solid var(--sp-line); }
    .mb-label { font-size:10px; color:var(--sp-ink-xs); font-weight:700; letter-spacing:0.08em; margin-bottom:8px; }
    .mb-row { display:flex; justify-content:space-between; font-size:11.5px; padding:3px 0; }
    .up { color:var(--sp-teal); font-weight:600; }

    .main { flex:1; display:flex; flex-direction:column; min-width:0; }
    .topbar { height:56px; border-bottom:1px solid var(--sp-line); background:var(--sp-surface); display:flex; align-items:center; justify-content:space-between; padding:0 20px; }
    .nse-open { display:flex; align-items:center; gap:8px; font-size:12px; color:var(--sp-ink-dim); }
    .pulse { width:8px; height:8px; border-radius:50%; background:var(--sp-teal); box-shadow:0 0 0 0 var(--sp-teal); animation:pulse 1.6s infinite; }
    @keyframes pulse { 0% { box-shadow:0 0 0 0 rgba(45,212,191,0.55); } 70% { box-shadow:0 0 0 8px rgba(45,212,191,0); } 100% { box-shadow:0 0 0 0 rgba(45,212,191,0); } }
    .actions { display:flex; align-items:center; gap:4px; }

    .content { flex:1; overflow-y:auto; }
  `],
})
export class ShellComponent implements OnInit {
  private auth = inject(AuthService);
  private realtime = inject(RealtimeService);
  private router = inject(Router);

  user = this.auth.user;
  isAdmin = this.auth.isAdmin;
  sidebarCollapsed = signal(false);
  unread = signal(0);
  today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  initials = computed(() => {
    const name = this.user()?.name || '';
    return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
  });

  navItems = [
    { path: '/feed',        icon: 'rss_feed',      label: 'Feed' },
    { path: '/analysis',    icon: 'analytics',     label: 'Analysis' },
    { path: '/analysts',    icon: 'verified_user', label: 'Analysts' },
    { path: '/leaderboard', icon: 'leaderboard',   label: 'Leaderboard' },
    { path: '/watchlist',   icon: 'bookmark',      label: 'Watchlist' },
    { path: '/profile',     icon: 'person',        label: 'My Profile' },
  ];

  ngOnInit(): void { this.realtime.connect(); }
  logout(): void { this.auth.logout(); }
}
