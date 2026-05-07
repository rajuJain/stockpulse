import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AdminService } from '../../core/services/api.services';
import { User, Plan } from '../../core/models';

@Component({
  standalone: true,
  selector: 'sp-admin',
  imports: [CommonModule, MatCardModule, MatTabsModule, MatTableModule, MatButtonModule, MatIconModule, MatDialogModule],
  template: `
    <div class="wrap">
      <h2>Admin Dashboard</h2>

      <mat-tab-group>
        <!-- Overview -->
        <mat-tab label="Overview">
          <div class="tab">
            @if (overview()) {
              <div class="kpi-grid">
                <mat-card class="kpi"><div class="lbl">Total Users</div><div class="val">{{ overview()!.totalUsers }}</div></mat-card>
                <mat-card class="kpi"><div class="lbl">Active Plans</div><div class="val">{{ overview()!.activePlans }}</div><div class="sub">{{ overview()!.totalSubs }} subscribers</div></mat-card>
                <mat-card class="kpi"><div class="lbl">Gross Revenue</div><div class="val">₹{{ overview()!.totalRevenue | number }}</div></mat-card>
                <mat-card class="kpi"><div class="lbl">SEBI Pending</div><div class="val amber">{{ overview()!.sebiPending }}</div></mat-card>
                <mat-card class="kpi"><div class="lbl">SEBI Verified</div><div class="val teal">{{ overview()!.sebiVerified }}</div></mat-card>
                <mat-card class="kpi"><div class="lbl">Total Tips</div><div class="val">{{ overview()!.totalTips }}</div><div class="sub">{{ overview()!.premiumTips }} premium</div></mat-card>
                <mat-card class="kpi"><div class="lbl">Total Posts</div><div class="val">{{ overview()!.totalPosts }}</div></mat-card>
                <mat-card class="kpi"><div class="lbl">Suspended</div><div class="val red">{{ overview()!.suspendedUsers }}</div></mat-card>
              </div>
            }
          </div>
        </mat-tab>

        <!-- Users -->
        <mat-tab label="All Users">
          <div class="tab">
            <mat-card class="table-card">
              <table mat-table [dataSource]="users()">
                <ng-container matColumnDef="name">
                  <th mat-header-cell *matHeaderCellDef>User</th>
                  <td mat-cell *matCellDef="let u">
                    <div class="u">
                      <b>{{ u.name }}</b>
                      <span class="h">{{ u.handle }}</span>
                    </div>
                  </td>
                </ng-container>
                <ng-container matColumnDef="email">
                  <th mat-header-cell *matHeaderCellDef>Email</th>
                  <td mat-cell *matCellDef="let u">{{ u.email }}</td>
                </ng-container>
                <ng-container matColumnDef="sebi">
                  <th mat-header-cell *matHeaderCellDef>SEBI</th>
                  <td mat-cell *matCellDef="let u">
                    @if (u.sebiVerified) { <span class="chip sebi">✓ Verified</span> }
                    @else if (u.sebi) { <span class="chip pending">Pending</span> }
                    @else { <span class="na">N/A</span> }
                  </td>
                </ng-container>
                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef>Status</th>
                  <td mat-cell *matCellDef="let u">
                    <span class="status" [class]="u.status">{{ u.status }}</span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef>Actions</th>
                  <td mat-cell *matCellDef="let u">
                    @if (u.status === 'active') {
                      <button mat-stroked-button color="warn" (click)="suspend(u)">Suspend</button>
                    } @else if (u.status === 'suspended') {
                      <button mat-stroked-button (click)="unsuspend(u)">Reactivate</button>
                    }
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="userCols"></tr>
                <tr mat-row *matRowDef="let row; columns: userCols" [class.suspended]="row.status === 'suspended'"></tr>
              </table>
            </mat-card>
          </div>
        </mat-tab>

        <!-- SEBI Queue -->
        <mat-tab label="SEBI Queue">
          <div class="tab">
            @if (sebiQueue().length === 0) {
              <mat-card class="empty-card">✓ All SEBI verifications are up to date.</mat-card>
            } @else {
              @for (u of sebiQueue(); track u.id) {
                <mat-card class="sebi-card">
                  <div class="sc-main">
                    <div><b>{{ u.name }}</b> <span class="h">{{ u.handle }}</span></div>
                    <div class="regno">SEBI Reg: <b>{{ u.regNo }}</b></div>
                    @if (u.bio) { <p class="bio">{{ u.bio }}</p> }
                  </div>
                  <div class="sc-actions">
                    <button mat-flat-button color="primary" (click)="approveSebi(u)">Approve</button>
                    <button mat-stroked-button color="warn" (click)="rejectSebi(u)">Reject</button>
                  </div>
                </mat-card>
              }
            }
          </div>
        </mat-tab>

        <!-- Plans -->
        <mat-tab label="Plans">
          <div class="tab">
            <mat-card class="table-card">
              <table mat-table [dataSource]="plans()">
                <ng-container matColumnDef="analyst">
                  <th mat-header-cell *matHeaderCellDef>Analyst</th>
                  <td mat-cell *matCellDef="let p">{{ p.user?.name }}</td>
                </ng-container>
                <ng-container matColumnDef="name">
                  <th mat-header-cell *matHeaderCellDef>Plan</th>
                  <td mat-cell *matCellDef="let p"><b>{{ p.name }}</b></td>
                </ng-container>
                <ng-container matColumnDef="price">
                  <th mat-header-cell *matHeaderCellDef>Price</th>
                  <td mat-cell *matCellDef="let p">₹{{ p.price }}</td>
                </ng-container>
                <ng-container matColumnDef="subs">
                  <th mat-header-cell *matHeaderCellDef>Subscribers</th>
                  <td mat-cell *matCellDef="let p">{{ p.subscriberCount }} / {{ p.maxSubs }}</td>
                </ng-container>
                <ng-container matColumnDef="revenue">
                  <th mat-header-cell *matHeaderCellDef>Revenue</th>
                  <td mat-cell *matCellDef="let p">₹{{ p.totalRevenue | number }}</td>
                </ng-container>
                <ng-container matColumnDef="action">
                  <th mat-header-cell *matHeaderCellDef>Action</th>
                  <td mat-cell *matCellDef="let p">
                    <button mat-stroked-button color="warn" (click)="deactivatePlan(p)">Deactivate</button>
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="planCols"></tr>
                <tr mat-row *matRowDef="let row; columns: planCols"></tr>
              </table>
            </mat-card>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [`
    .wrap { padding:24px; max-width:1280px; margin:0 auto; }
    h2 { margin:0 0 20px; font-size:22px; font-weight:700; }
    .tab { padding:20px 0; display:flex; flex-direction:column; gap:14px; }

    .kpi-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:14px; }
    .kpi { padding:16px 18px; background:var(--sp-surface); }
    .lbl { font-size:10px; text-transform:uppercase; letter-spacing:0.07em; color:var(--sp-ink-xs); font-weight:700; margin-bottom:6px; }
    .val { font-size:26px; font-weight:800; }
    .val.teal { color:var(--sp-teal); }
    .val.amber { color:var(--sp-amber); }
    .val.red { color:var(--sp-red); }
    .sub { font-size:11px; color:var(--sp-ink-dim); margin-top:4px; }

    .table-card { padding:0; background:var(--sp-surface); overflow:hidden; }
    table { width:100%; }
    tr.suspended { background:rgba(239,68,68,0.04); }
    .u { display:flex; flex-direction:column; }
    .u .h { font-size:11px; color:var(--sp-ink-dim); }
    .chip.sebi { background:var(--sp-teal-dim); color:var(--sp-teal); padding:2px 7px; border-radius:3px; font-size:10px; font-weight:700; }
    .chip.pending { background:rgba(245,158,11,0.15); color:var(--sp-amber); padding:2px 7px; border-radius:3px; font-size:10px; font-weight:700; }
    .na { color:var(--sp-ink-xs); }
    .status { padding:2px 8px; border-radius:3px; font-size:10px; font-weight:700; text-transform:uppercase; }
    .status.active { background:var(--sp-teal-dim); color:var(--sp-teal); }
    .status.suspended { background:var(--sp-red-dim); color:var(--sp-red); }

    .empty-card { padding:30px; text-align:center; color:var(--sp-ink-dim); background:var(--sp-surface); }
    .sebi-card { display:flex; gap:16px; justify-content:space-between; padding:18px; background:rgba(245,158,11,0.05); border-left:3px solid var(--sp-amber); }
    .sc-main { flex:1; }
    .sc-main .h { color:var(--sp-ink-dim); font-size:12px; margin-left:6px; }
    .regno { font-family:monospace; font-size:12px; color:var(--sp-ink-dim); margin:6px 0; }
    .bio { font-size:13px; color:var(--sp-ink-md); margin:8px 0 0; }
    .sc-actions { display:flex; gap:8px; align-items:flex-start; }
  `],
})
export class AdminComponent implements OnInit {
  private api = inject(AdminService);
  private snack = inject(MatSnackBar);

  overview = signal<any | null>(null);
  users = signal<User[]>([]);
  sebiQueue = signal<User[]>([]);
  plans = signal<Plan[]>([]);

  userCols = ['name', 'email', 'sebi', 'status', 'actions'];
  planCols = ['analyst', 'name', 'price', 'subs', 'revenue', 'action'];

  ngOnInit(): void { this.refresh(); }

  refresh(): void {
    this.api.overview().subscribe(o => this.overview.set(o));
    this.api.users().subscribe(u => this.users.set(u));
    this.api.sebiQueue().subscribe(q => this.sebiQueue.set(q));
    this.api.plans().subscribe(p => this.plans.set(p));
  }

  approveSebi(u: User): void {
    if (!confirm(`Approve SEBI verification for ${u.name}?`)) return;
    this.api.approveSebi(u.id).subscribe(() => { this.snack.open(`${u.name} verified`, 'Close', { duration: 2500 }); this.refresh(); });
  }

  rejectSebi(u: User): void {
    if (!confirm(`Reject SEBI registration for ${u.name}?`)) return;
    this.api.rejectSebi(u.id).subscribe(() => { this.snack.open('Rejected', 'Close', { duration: 2500 }); this.refresh(); });
  }

  suspend(u: User): void {
    if (!confirm(`Suspend ${u.name}?`)) return;
    this.api.suspend(u.id).subscribe(() => this.refresh());
  }

  unsuspend(u: User): void {
    this.api.unsuspend(u.id).subscribe(() => this.refresh());
  }

  deactivatePlan(p: Plan): void {
    if (!confirm(`Deactivate ${p.user?.name}'s plan?`)) return;
    this.api.deactivatePlan(p.userId).subscribe(() => { this.snack.open('Plan deactivated', 'Close', { duration: 2500 }); this.refresh(); });
  }
}
