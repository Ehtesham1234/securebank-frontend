import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { SharedModule } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TransactionResponse, TransactionStatus } from '../../../core/models/account.model';
import { NotificationService } from '../../../core/services/notification.service';
import { AdminTransactionSearchField, AdminTransactionsService } from '../admin-transactions.service';

@Component({
  selector: 'sb-admin-transactions-list',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, TableModule, SharedModule, ButtonModule, DialogModule, TagModule ,InputTextModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-transactions-list.component.html',
})
export class AdminTransactionsListComponent implements OnInit {
  readonly service = inject(AdminTransactionsService);
  private readonly notify = inject(NotificationService);
  readonly searchField = signal<AdminTransactionSearchField>('search');
  readonly searchValue = signal('');
  /** Transaction pending reverse confirmation — same pattern as Admin
   *  Accounts' close confirmation: a significant action gets a confirm
   *  step rather than firing directly from the row button. */
  readonly reverseTarget = signal<TransactionResponse | null>(null);
  readonly reverseSubmitting = signal(false);

  ngOnInit(): void {
    this.service.refresh();
  }
  onSearchFieldChange(event: Event): void {
    this.searchField.set((event.target as HTMLSelectElement).value as AdminTransactionSearchField);
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
  statusSeverity(status: TransactionStatus): 'success' | 'danger' | 'secondary' {
    switch (status) {
      case 'SUCCESS':
        return 'success';
      case 'FAILED':
        return 'danger';
      case 'REVERSED':
        return 'secondary';
    }
  }

  openReverseConfirm(transaction: TransactionResponse): void {
    this.reverseTarget.set(transaction);
  }

  cancelReverse(): void {
    this.reverseTarget.set(null);
  }

  confirmReverse(): void {
    const transaction = this.reverseTarget();
    if (!transaction) return;

    this.reverseSubmitting.set(true);
    this.service.reverse(transaction.id).subscribe({
      next: () => {
        this.reverseSubmitting.set(false);
        this.notify.success(`Transaction ${transaction.transactionRef} reversed.`);
        this.reverseTarget.set(null);
      },
      error: () => this.reverseSubmitting.set(false),
    });
  }
}