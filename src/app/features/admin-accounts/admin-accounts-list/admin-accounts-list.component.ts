import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { SharedModule } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { AccountResponse, AccountStatus } from '../../../core/models/account.model';
import { NotificationService } from '../../../core/services/notification.service';
import { AdminAccountSearchField, AdminAccountsService } from '../admin-accounts.service';

@Component({
  selector: 'sb-admin-accounts-list',
  standalone: true,
  imports: [CurrencyPipe, TableModule, SharedModule, ButtonModule, DialogModule, TagModule ,InputTextModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-accounts-list.component.html',
})
export class AdminAccountsListComponent implements OnInit {
  readonly service = inject(AdminAccountsService);
  private readonly notify = inject(NotificationService);
  readonly searchField = signal<AdminAccountSearchField>('search');
  readonly searchValue = signal('');
  /** accountId currently running a freeze/unfreeze call. */
  readonly actionInFlight = signal<number | null>(null);

  /** Account pending close confirmation — null means the confirm dialog
   *  is closed. Close is the one destructive, irreversible action here
   *  (no "reopen" endpoint exists), so unlike freeze/unfreeze it gets a
   *  confirm step rather than firing directly from a button click. */
  readonly closeTarget = signal<AccountResponse | null>(null);
  readonly closeSubmitting = signal(false);

  ngOnInit(): void {
    this.service.refresh();
  }
  onSearchFieldChange(event: Event): void {
    this.searchField.set((event.target as HTMLSelectElement).value as AdminAccountSearchField);
  }

  onSearchValueInput(event: Event): void {
    this.searchValue.set((event.target as HTMLInputElement).value);
  }

  submitSearch(): void {
    this.service.refresh(this.searchField(), this.searchValue());
  }

  clearSearch(): void {
    this.searchValue.set('');
    this.service.refresh();
  }
  statusSeverity(status: AccountStatus): 'success' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'FROZEN':
        return 'warn';
      case 'CLOSED':
        return 'danger';
      case 'DORMANT':
        return 'secondary';
    }
  }

  toggleFreeze(account: AccountResponse): void {
    this.actionInFlight.set(account.id);
    const action$ =
      account.accountStatus === 'FROZEN'
        ? this.service.unfreeze(account.id)
        : this.service.freeze(account.id);
    action$.subscribe({
      next: () => this.actionInFlight.set(null),
      error: () => this.actionInFlight.set(null),
    });
  }

  openCloseConfirm(account: AccountResponse): void {
    this.closeTarget.set(account);
  }

  cancelClose(): void {
    this.closeTarget.set(null);
  }

  confirmClose(): void {
    const account = this.closeTarget();
    if (!account) return;

    this.closeSubmitting.set(true);
    this.service.close(account.id).subscribe({
      next: () => {
        this.closeSubmitting.set(false);
        this.notify.success(`Account ${account.accountNumber} closed.`);
        this.closeTarget.set(null);
      },
      error: () => this.closeSubmitting.set(false),
    });
  }
}