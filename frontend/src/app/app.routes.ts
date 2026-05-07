import { Routes } from '@angular/router';
import { authGuard, adminGuard, guestGuard } from './core/guards/auth.guards';

export const APP_ROUTES: Routes = [
  {
    path: 'auth',
    canActivate: [guestGuard],
    children: [
      { path: 'login',    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent) },
      { path: 'register', loadComponent: () => import('./features/auth/register.component').then(m => m.RegisterComponent) },
      { path: '', pathMatch: 'full', redirectTo: 'login' },
    ],
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shared/components/shell.component').then(m => m.ShellComponent),
    children: [
      { path: '',          pathMatch: 'full', redirectTo: 'feed' },
      { path: 'feed',       loadComponent: () => import('./features/feed/feed.component').then(m => m.FeedComponent) },
      { path: 'analysis',   loadComponent: () => import('./features/analysis/analysis.component').then(m => m.AnalysisComponent) },
      { path: 'analysts',   loadComponent: () => import('./features/analysts/analysts.component').then(m => m.AnalystsComponent) },
      { path: 'analysts/:id', loadComponent: () => import('./features/analysts/analyst-profile.component').then(m => m.AnalystProfileComponent) },
      { path: 'leaderboard', loadComponent: () => import('./features/leaderboard/leaderboard.component').then(m => m.LeaderboardComponent) },
      { path: 'watchlist',  loadComponent: () => import('./features/watchlist/watchlist.component').then(m => m.WatchlistComponent) },
      { path: 'profile',    loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent) },
      {
        path: 'admin',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/admin/admin.component').then(m => m.AdminComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
