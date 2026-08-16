import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { AccountsService } from '../../accounts/accounts.service';
import { ErrorResponse } from '../../../core/models/api-response.model';
import { LoanResponse, LoanStatus, LoanType } from '../../../core/models/loan.model';
import { LoansService } from '../loans.service';
import { Dialog } from "primeng/dialog";

const LOAN_TYPE_OPTIONS: { value: LoanType; label: string }[] = [
  { value: 'PERSONAL_LOAN', label: 'Personal Loan' },
  { value: 'HOME_LOAN', label: 'Home Loan' },
  { value: 'CAR_LOAN', label: 'Car Loan' },
];

@Component({
  selector: 'sb-loans-list',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CurrencyPipe,
    DatePipe,
    ButtonModule,
    SelectModule,
    InputNumberModule,
    InputTextModule,
    TagModule,
    Dialog
],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './loans-list.component.html',
})
export class LoansListComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly service = inject(LoansService);
  private readonly accountsService = inject(AccountsService);

  readonly loanTypeOptions = LOAN_TYPE_OPTIONS;
  readonly applying = signal(false);
  readonly submitting = signal(false);
  private readonly backendFieldErrors = signal<Record<string, string>>({});
  private readonly submitError = signal<string | null>(null);

  /** Only ACTIVE, non-FIXED_DEPOSIT accounts can receive a disbursement —
   *  same rule as Transfer's from-account, so this reads the same shared
   *  computed on AccountsService rather than redefining the filter. */
  readonly disbursementAccountOptions = computed(() =>
    this.accountsService.liquidAccounts().map((a) => ({
      value: a.id,
      label: `${a.accountType} · ${this.maskAccountNumber(a.accountNumber)}`,
    })),
  );

  readonly form = this.fb.nonNullable.group({
    loanType: ['PERSONAL_LOAN' as LoanType, Validators.required],
    amount: [null as number | null, [Validators.required, Validators.min(10000)]],
    tenureMonths: [null as number | null, [Validators.required, Validators.min(6), Validators.max(240)]],
    purpose: ['', [Validators.required, Validators.maxLength(500)]],
    accountId: [null as number | null, Validators.required],
  });

  readonly payEmiTarget = signal<LoanResponse | null>(null);
  readonly payEmiSubmitting = signal(false);
  readonly payEmiError = signal<string | null>(null);

  readonly payEmiForm = this.fb.nonNullable.group({
    accountId: [null as number | null, Validators.required],
  });

  ngOnInit(): void {
    this.service.refresh();
    this.accountsService.refresh();
  }

  maskAccountNumber(accountNumber: string): string {
    return accountNumber.length <= 4 ? accountNumber : `•••• ${accountNumber.slice(-4)}`;
  }

  fieldError(name: string): string | null {
    return this.backendFieldErrors()[name] ?? null;
  }

  submitErrorMessage(): string | null {
    return this.submitError();
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

  startApply(): void {
    this.applying.set(true);
  }
  
  openPayEmi(loan: LoanResponse): void {
    this.payEmiTarget.set(loan);
    this.payEmiError.set(null);
    this.payEmiForm.reset({ accountId: null });
  }

  closePayEmi(): void {
    this.payEmiTarget.set(null);
  }

  submitPayEmi(): void {
    const loan = this.payEmiTarget();
    if (!loan || this.payEmiForm.invalid) {
      this.payEmiForm.markAllAsTouched();
      return;
    }

    this.payEmiError.set(null);
    this.payEmiSubmitting.set(true);
    const { accountId } = this.payEmiForm.getRawValue();

    this.service.payEmi(loan.id, accountId!).subscribe({
      next: () => {
        this.payEmiSubmitting.set(false);
        this.closePayEmi();
      },
      error: (err: unknown) => {
        this.payEmiSubmitting.set(false);
        if (err instanceof HttpErrorResponse && err.status === 400) {
          const body = err.error as ErrorResponse | undefined;
          if (body?.message && !body.validationErrors) {
            this.payEmiError.set(body.message);
          }
        } else if (err instanceof HttpErrorResponse && err.status === 0) {
          // The known CORS gap (X-Account-Id not yet in the gateway's
          // allowedHeaders) surfaces exactly this way: a status-0 error
          // with no response body at all, since the browser blocks the
          // request before it's sent — see the comment on
          // LoansService.payEmi for the fix.
          this.payEmiError.set(
            "Couldn't reach the server for this request — check the browser console for a CORS error.",
          );
        }
      },
    });
  }

  cancelApply(): void {
    this.applying.set(false);
    this.form.reset({
      loanType: 'PERSONAL_LOAN',
      amount: null,
      tenureMonths: null,
      purpose: '',
      accountId: null,
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.backendFieldErrors.set({});
    this.submitError.set(null);
    this.submitting.set(true);
    const { loanType, amount, tenureMonths, purpose, accountId } = this.form.getRawValue();

    this.service
      .apply({ loanType, amount: amount!, tenureMonths: tenureMonths!, purpose, accountId: accountId! })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.cancelApply();
        },
        error: (err: unknown) => {
          this.submitting.set(false);
          if (err instanceof HttpErrorResponse && err.status === 400) {
            const body = err.error as ErrorResponse | undefined;
            if (body?.validationErrors) {
              this.backendFieldErrors.set(body.validationErrors);
            } else if (body?.message) {
              // LoanOperationException (business-rule 400s, e.g. an
              // existing pending application) has no per-field detail —
              // just a message.
              this.submitError.set(body.message);
            }
          }
        },
      });
  }
}