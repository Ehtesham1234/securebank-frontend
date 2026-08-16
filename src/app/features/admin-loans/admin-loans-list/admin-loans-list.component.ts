import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SharedModule } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ErrorResponse } from '../../../core/models/api-response.model';
import { LoanResponse } from '../../../core/models/loan.model';
import { NotificationService } from '../../../core/services/notification.service';
import { AdminLoansService } from '../admin-loans.service';

@Component({
  selector: 'sb-admin-loans-list',
  standalone: true,
  imports: [DatePipe, CurrencyPipe, TableModule, SharedModule, ButtonModule, DialogModule, TagModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-loans-list.component.html',
})
export class AdminLoansListComponent implements OnInit {
  readonly service = inject(AdminLoansService);
  private readonly notify = inject(NotificationService);

  readonly selected = signal<LoanResponse | null>(null);
  readonly reason = signal('');
  readonly actionInFlight = signal(false);
  readonly reasonError = signal<string | null>(null);

  ngOnInit(): void {
    this.service.refresh();
  }

  open(loan: LoanResponse): void {
    this.selected.set(loan);
    this.reason.set('');
    this.reasonError.set(null);
  }

  close(): void {
    this.selected.set(null);
  }

  onReasonInput(event: Event): void {
    this.reason.set((event.target as HTMLTextAreaElement).value);
  }

  approve(): void {
    const loan = this.selected();
    const reason = this.reason().trim();
    if (!loan || !reason) {
      this.reasonError.set('Enter a note before approving.');
      return;
    }

    this.reasonError.set(null);
    this.actionInFlight.set(true);
    this.service.approve(loan.id, { reason }).subscribe({
      next: () => {
        this.actionInFlight.set(false);
        this.notify.success(`Loan ${loan.loanRef} approved — funds will be disbursed.`);
        this.close();
      },
      error: (err) => this.handleActionError(err),
    });
  }

  reject(): void {
    const loan = this.selected();
    const reason = this.reason().trim();
    if (!loan || !reason) {
      this.reasonError.set('Enter a reason before rejecting.');
      return;
    }

    this.reasonError.set(null);
    this.actionInFlight.set(true);
    this.service.reject(loan.id, { reason }).subscribe({
      next: () => {
        this.actionInFlight.set(false);
        this.notify.info(`Loan ${loan.loanRef} rejected.`);
        this.close();
      },
      error: (err) => this.handleActionError(err),
    });
  }

  private handleActionError(err: unknown): void {
    this.actionInFlight.set(false);
    if (err instanceof HttpErrorResponse && err.status === 400) {
      const body = err.error as ErrorResponse | undefined;
      const fieldMsg = body?.validationErrors?.['reason'];
      if (fieldMsg) {
        this.reasonError.set(fieldMsg);
      }
    }
  }
}