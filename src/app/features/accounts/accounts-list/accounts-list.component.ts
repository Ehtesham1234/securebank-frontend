import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ErrorResponse } from '../../../core/models/api-response.model';
import { AccountResponse, AccountStatus, AccountType } from '../../../core/models/account.model';
import { AccountsService } from '../accounts.service';
import { DialogModule, Dialog } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TransactionsService } from '../transactions.service';
const ACCOUNT_TYPE_OPTIONS: { value: AccountType; label: string }[] = [
  { value: 'SAVINGS', label: 'Savings' },
  { value: 'CURRENT', label: 'Current' },
  { value: 'FIXED_DEPOSIT', label: 'Fixed Deposit' },
];

@Component({
  selector: 'sb-accounts-list',
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyPipe, ButtonModule, SelectModule, InputNumberModule, TagModule, Dialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './accounts-list.component.html',
})
export class AccountsListComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly service = inject(AccountsService);
  private readonly transactions = inject(TransactionsService);
  readonly accountTypeOptions = ACCOUNT_TYPE_OPTIONS;
  readonly applying = signal(false);
  readonly submitting = signal(false);
  private readonly backendFieldErrors = signal<Record<string, string>>({});
  private readonly revealedAccountIds = signal<ReadonlySet<number>>(new Set());
/** Which account the deposit dialog is open for — null means closed. */
  readonly depositTarget = signal<AccountResponse | null>(null);
  readonly depositSubmitting = signal(false);
  readonly depositError = signal<string | null>(null);

  readonly depositForm = this.fb.nonNullable.group({
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    description: [''],
  });
  readonly form = this.fb.nonNullable.group({
    accountType: ['SAVINGS' as AccountType, Validators.required],
    initialDeposit: [null as number | null],
    durationMonths: [null as number | null],
  });

  /**
   * `computed()` only tracks Signal reads — a plain `FormControl.value`
   * read inside it is invisible to it, so it would never re-evaluate past
   * its first call. `toSignal()` bridges accountType's valueChanges
   * Observable into an actual Signal so `computed()` has something real to
   * track. (This bit me: the earlier version read
   * `this.form.controls.accountType.value` directly in a computed() and it
   * silently never updated after the initial 'SAVINGS' default — the
   * Fixed Deposit fields never appeared no matter what you picked.)
   */
  private readonly accountTypeValue = toSignal(this.form.controls.accountType.valueChanges, {
    initialValue: this.form.controls.accountType.value,
  });
  readonly isFixedDeposit = computed(() => this.accountTypeValue() === 'FIXED_DEPOSIT');
/** Withdraw dialog — same shape as deposit's, duplicated rather than
   *  shared for now since it's small. Once Cards' pay-bill dialog lands
   *  (a third near-identical money-movement flow), that's the point where
   *  extracting a shared dialog component starts paying for itself. */
  readonly withdrawTarget = signal<AccountResponse | null>(null);
  readonly withdrawSubmitting = signal(false);
  readonly withdrawError = signal<string | null>(null);

  readonly withdrawForm = this.fb.nonNullable.group({
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    description: [''],
  });

  /** Transfer dialog — page-level rather than per-card, since the source
   *  account is picked inside the dialog rather than implied by which
   *  card you clicked. */
  readonly transferring = signal(false);
  readonly transferSubmitting = signal(false);
  readonly transferError = signal<string | null>(null);

  readonly transferForm = this.fb.nonNullable.group({
    fromAccountNumber: ['', Validators.required],
    toAccountNumber: ['', Validators.required],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    description: [''],
  });

 /** Now sourced from AccountsService.liquidAccounts (ACTIVE,
   *  non-FIXED_DEPOSIT) — was a locally-duplicated filter here until Loans
   *  needed the identical logic for its disbursement-account picker; moved
   *  to the service so both consume one definition instead of two that
   *  could drift apart. */
  readonly transferableAccounts = this.service.liquidAccounts;

  /** p-select needs a flat string to display — accountType/accountNumber
   *  live on separate fields on AccountResponse, so this composes them
   *  into one label per option (same {value, label} shape as
   *  ACCOUNT_TYPE_OPTIONS above). */
  readonly transferableAccountOptions = computed(() =>
    this.transferableAccounts().map((a) => ({
      value: a.accountNumber,
      label: `${a.accountType} · ${this.maskAccountNumber(a.accountNumber)}`,
    })),
  );
  constructor() {
    // Fixed Deposit's amount/duration only matter — and only need to be
    // required — while that account type is selected. Toggling validators
    // here (rather than always requiring them) keeps SAVINGS/CURRENT
    // applications from being blocked by fields they don't use.
    effect(() => {
      const isFd = this.isFixedDeposit();
      const deposit = this.form.controls.initialDeposit;
      const duration = this.form.controls.durationMonths;

      deposit.setValidators(isFd ? [Validators.required, Validators.min(1000)] : []);
      duration.setValidators(isFd ? [Validators.required, Validators.min(1), Validators.max(120)] : []);
      deposit.updateValueAndValidity({ emitEvent: false });
      duration.updateValueAndValidity({ emitEvent: false });
    });
  }

  ngOnInit(): void {
    this.service.refresh();
  }

  fieldError(name: string): string | null {
    return this.backendFieldErrors()[name] ?? null;
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

  maskAccountNumber(accountNumber: string): string {
    return accountNumber.length <= 4 ? accountNumber : `•••• ${accountNumber.slice(-4)}`;
  }

  isRevealed(accountId: number): boolean {
    return this.revealedAccountIds().has(accountId);
  }

  toggleReveal(accountId: number): void {
    this.revealedAccountIds.update((current) => {
      const next = new Set(current);
      if (next.has(accountId)) {
        next.delete(accountId);
      } else {
        next.add(accountId);
      }
      return next;
    });
  }
openWithdraw(account: AccountResponse): void {
    this.withdrawTarget.set(account);
    this.withdrawError.set(null);
    this.withdrawForm.reset({ amount: null, description: '' });
  }

  closeWithdraw(): void {
    this.withdrawTarget.set(null);
  }

  submitWithdraw(): void {
    const account = this.withdrawTarget();
    if (!account || this.withdrawForm.invalid) {
      this.withdrawForm.markAllAsTouched();
      return;
    }

    this.withdrawError.set(null);
    this.withdrawSubmitting.set(true);
    const { amount, description } = this.withdrawForm.getRawValue();

    this.transactions.withdraw(account.id, { amount: amount!, description: description || undefined }).subscribe({
      next: (transaction) => {
        this.withdrawSubmitting.set(false);
        this.service.applyBalanceUpdate(account.id, transaction.balanceAfter);
        this.closeWithdraw();
      },
      error: (err: unknown) => {
        this.withdrawSubmitting.set(false);
        // Unlike deposit, INSUFFICIENT_FUNDS is a very real outcome here —
        // this is exactly the "low balance" toast/inline-message case.
        if (err instanceof HttpErrorResponse && err.status === 400) {
          const body = err.error as ErrorResponse | undefined;
          if (body?.message && !body.validationErrors) {
            this.withdrawError.set(body.message);
          }
        }
      },
    });
  }

  openTransfer(): void {
    this.transferring.set(true);
    this.transferError.set(null);
    const defaultFrom = this.transferableAccounts()[0]?.accountNumber ?? '';
    this.transferForm.reset({
      fromAccountNumber: defaultFrom,
      toAccountNumber: '',
      amount: null,
      description: '',
    });
  }

  closeTransfer(): void {
    this.transferring.set(false);
  }

  submitTransfer(): void {
    if (this.transferForm.invalid) {
      this.transferForm.markAllAsTouched();
      return;
    }

    this.transferError.set(null);
    this.transferSubmitting.set(true);
    const { fromAccountNumber, toAccountNumber, amount, description } = this.transferForm.getRawValue();

    this.transactions
      .transfer({
        fromAccountNumber,
        toAccountNumber,
        amount: amount!,
        description: description || undefined,
      })
      .subscribe({
        next: (transaction) => {
          this.transferSubmitting.set(false);
          // The response is the sender's side — resolve which local
          // account that is by number so we can patch its balance (the
          // service only takes an id, not a number, for that update).
          const fromAccount = this.service
            .accounts()
            .find((a) => a.accountNumber === transaction.accountNumber);
          if (fromAccount) {
            this.service.applyBalanceUpdate(fromAccount.id, transaction.balanceAfter);
          }
          this.closeTransfer();
        },
        error: (err: unknown) => {
          this.transferSubmitting.set(false);
          if (err instanceof HttpErrorResponse && err.status === 400) {
            const body = err.error as ErrorResponse | undefined;
            if (body?.message && !body.validationErrors) {
              this.transferError.set(body.message);
            }
          }
        },
      });
  }
  startApply(): void {
    this.applying.set(true);
  }
openDeposit(account: AccountResponse): void {
    this.depositTarget.set(account);
    this.depositError.set(null);
    this.depositForm.reset({ amount: null, description: '' });
  }

  closeDeposit(): void {
    this.depositTarget.set(null);
  }

  submitDeposit(): void {
    const account = this.depositTarget();
    if (!account || this.depositForm.invalid) {
      this.depositForm.markAllAsTouched();
      return;
    }

    this.depositError.set(null);
    this.depositSubmitting.set(true);
    const { amount, description } = this.depositForm.getRawValue();

    this.transactions.deposit(account.id, { amount: amount!, description: description || undefined }).subscribe({
      next: (transaction) => {
        this.depositSubmitting.set(false);
        this.service.applyBalanceUpdate(account.id, transaction.balanceAfter);
        this.closeDeposit();
      },
      error: (err: unknown) => {
        this.depositSubmitting.set(false);
        // INSUFFICIENT_FUNDS shouldn't fire on a deposit (there's no
        // balance floor to violate) but a couple of business-rule 400s
        // are possible here (e.g. a frozen/closed account) — surface
        // whatever the backend says rather than a generic message. The
        // interceptor's toast already fires too; this is a second, more
        // prominent copy right where the user is looking.
        if (err instanceof HttpErrorResponse && err.status === 400) {
          const body = err.error as ErrorResponse | undefined;
          if (body?.message && !body.validationErrors) {
            this.depositError.set(body.message);
          }
        }
      },
    });
  }
  cancelApply(): void {
    this.applying.set(false);
    this.form.reset({ accountType: 'SAVINGS', initialDeposit: null, durationMonths: null });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.backendFieldErrors.set({});
    this.submitting.set(true);
    const { accountType, initialDeposit, durationMonths } = this.form.getRawValue();

    this.service
      .apply({
        accountType,
        initialDeposit: initialDeposit ?? undefined,
        durationMonths: durationMonths ?? undefined,
      })
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
            }
          }
        },
      });
  }
  
}