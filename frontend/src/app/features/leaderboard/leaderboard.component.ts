import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { UsersService } from '../../core/services/api.services';
import { User } from '../../core/models';

@Component({
  standalone: true,
  selector: 'sp-leaderboard',
  imports: [CommonModule, RouterLink, MatTableModule, MatCardModule],
  template: `
    <div class="wrap">
      <h2>Leaderboard</h2>
      <p class="sub">Top-ranked analysts by accuracy and community points</p>
      <mat-card class="table-card">
        <table mat-table [dataSource]="rows()">
          <ng-container matColumnDef="rank">
            <th mat-header-cell *matHeaderCellDef>Rank</th>
            <td mat-cell *matCellDef="let u; let i = index"><span class="rank" [class.top]="i < 3">#{{ i + 1 }}</span></td>
          </ng-container>
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Analyst</th>
            <td mat-cell *matCellDef="let u">
              <a [routerLink]="['/analysts', u.id]" class="nm">
                {{ u.name }}
                @if (u.sebiVerified) { <span class="chip sebi">✓ SEBI</span> }
              </a>
            </td>
          </ng-container>
          <ng-container matColumnDef="accuracy">
            <th mat-header-cell *matHeaderCellDef>Accuracy</th>
            <td mat-cell *matCellDef="let u"><b class="up">{{ u.accuracy }}%</b></td>
          </ng-container>
          <ng-container matColumnDef="streak">
            <th mat-header-cell *matHeaderCellDef>Streak</th>
            <td mat-cell *matCellDef="let u">{{ u.streak }}</td>
          </ng-container>
          <ng-container matColumnDef="points">
            <th mat-header-cell *matHeaderCellDef>Points</th>
            <td mat-cell *matCellDef="let u">{{ u.points | number }}</td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols" (click)="router.navigate(['/analysts', row.id])"></tr>
        </table>
      </mat-card>
    </div>
  `,
  styles: [`
    .wrap { padding:24px; max-width:1100px; margin:0 auto; }
    h2 { margin:0 0 4px; font-size:22px; font-weight:700; }
    .sub { color:var(--sp-ink-dim); font-size:13px; margin-bottom:20px; }
    .table-card { padding:0; overflow:hidden; background:var(--sp-surface); }
    table { width:100%; }
    tr.mat-mdc-row { cursor:pointer; transition:background 0.1s; }
    tr.mat-mdc-row:hover { background:var(--sp-raised); }
    .rank { font-weight:700; color:var(--sp-ink-dim); }
    .rank.top { color:var(--sp-teal); font-size:15px; }
    .nm { color:var(--sp-ink); text-decoration:none; display:flex; gap:8px; align-items:center; }
    .chip.sebi { background:var(--sp-teal-dim); color:var(--sp-teal); padding:1px 6px; border-radius:3px; font-size:10px; font-weight:700; }
    .up { color:var(--sp-teal); }
  `],
})
export class LeaderboardComponent implements OnInit {
  private api = inject(UsersService);
  router = inject(Router);
  rows = signal<User[]>([]);
  cols = ['rank','name','accuracy','streak','points'];

  ngOnInit(): void { this.api.leaderboard().subscribe(r => this.rows.set(r)); }
}
