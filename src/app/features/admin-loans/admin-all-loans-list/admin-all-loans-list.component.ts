import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SharedModule } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { LoanStatus } from '../../../core/models/loan.model';
import { AdminLoanSearchField, AdminLoansService } from '../admin-loans.service';

@Component({
  selector: 'sb-admin-all-loans-list',
  standalone: true,
  imports: [CurrencyPipe, TableModule, SharedModule, ButtonModule, InputTextModule, TagModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-all-loans-list.component.html',
})
export class AdminAllLoansListComponent implements OnInit {
  readonly service = inject(AdminLoansService);

  readonly searchField = signal<AdminLoanSearchField>('search');
  readonly searchValue = signal('');

  ngOnInit(): void {
    this.service.refreshAll();
  }

  onSearchFieldChange(event: Event): void {
    this.searchField.set((event.target as HTMLSelectElement).value as AdminLoanSearchField);
  }

  onSearchValueInput(event: Event): void {
    this.searchValue.set((event.target as HTMLInputElement).value);
  }

  submitSearch(): void {
    this.service.refreshAll(this.searchField(), this.searchValue());
  }

  clearSearch(): void {
    this.searchValue.set('');
    this.service.refreshAll();
  }

  statusSeverity(status: LoanStatus): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'APPROVED':
        return 'info';
      case 'PENDING':
        return 'warn';
      case 'REJECTED':
      case 'DEFAULTED':
      case 'FAILED':
        return 'danger';
      case 'CLOSED':
        return 'secondary';
    }
  }
}