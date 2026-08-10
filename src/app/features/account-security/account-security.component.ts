import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { AccountSecurityService } from './account-security.service';

@Component({
  selector: 'sb-account-security',
  standalone: true,
  imports: [DatePipe, ButtonModule, TableModule, TagModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './account-security.component.html',
})
export class AccountSecurityComponent implements OnInit {
  protected readonly security = inject(AccountSecurityService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);

  /** tokenFamily currently being revoked, or null — drives the per-row
   *  button's loading state without a separate signal per row. */
  readonly revokingId = signal<string | null>(null);

  readonly confirmingLogoutAll = signal(false);
  readonly loggingOutAll = signal(false);

  ngOnInit(): void {
    this.security.refresh();
  }

  revoke(tokenFamily: string): void {
    this.revokingId.set(tokenFamily);
    this.security.revoke(tokenFamily).subscribe({
      next: () => {
        this.revokingId.set(null);
        this.notify.success('Session revoked.');
      },
      error: () => this.revokingId.set(null),
    });
  }

  logoutAllDevices(): void {
    this.loggingOutAll.set(true);
    this.security.logoutAllDevices().subscribe({
      next: () => {
        // The backend just revoked every session, including this one —
        // clear local state directly rather than calling AuthService.logout()
        // (that would hit /auth/logout again against an already-dead token).
        this.auth.clearLocalSession();
        this.notify.info("You've been logged out of every device.");
        void this.router.navigate(['/auth/login']);
      },
      error: () => {
        this.loggingOutAll.set(false);
        this.confirmingLogoutAll.set(false);
      },
    });
  }
}
