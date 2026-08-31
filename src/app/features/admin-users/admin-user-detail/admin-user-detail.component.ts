import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import {
  AccountResponse,
  AccountStatus,
  TransactionResponse,
  TransactionStatus,
} from '../../../core/models/account.model';
import { UserResponse } from '../../../core/models/auth.model';
import { Role, UserStatus } from '../../../core/models/enums';
import { LoanResponse, LoanStatus } from '../../../core/models/loan.model';
import { AdminAccountsService } from '../../admin-accounts/admin-accounts.service';
import { AdminLoansService } from '../../admin-loans/admin-loans.service';
import { AdminTransactionsService } from '../../admin-transactions/admin-transactions.service';
import { AdminUsersService } from '../admin-users.service';
import { CardResponse, CardStatus } from '../../../core/models/card.model';
import { AdminCardsService } from '../../admin-cards/admin-cards.service';
/** The four severity-mapping switches below (status/role/account/
 *  transaction/loan) duplicate what's already inline in
 *  accounts-list, cards-list, loans-list, and their admin
 *  equivalents — this is now the sixth copy. Worth extracting to a
 *  shared util if another one shows up. */
@Component({
  selector: 'sb-admin-user-detail',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, ButtonModule, DialogModule, TagModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-user-detail.component.html',
})
export class AdminUserDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly usersService = inject(AdminUsersService);
  private readonly accountsService = inject(AdminAccountsService);
  private readonly transactionsService = inject(AdminTransactionsService);
  private readonly loansService = inject(AdminLoansService);
  private readonly cardsService = inject(AdminCardsService);

  readonly user = signal<UserResponse | null>(null);
  readonly userLoading = signal(true);
  readonly userNotFound = signal(false);

  readonly accounts = signal<AccountResponse[]>([]);
  readonly accountsLoading = signal(true);

  /** accountId currently running a freeze/unfreeze call. */
  readonly accountActionInFlight = signal<number | null>(null);

  /** Account pending close confirmation — same pattern as the standalone
   *  Admin Accounts page: close is irreversible, so it gets a confirm
   *  step instead of firing directly from the row button. */
  readonly closeTarget = signal<AccountResponse | null>(null);
  readonly closeSubmitting = signal(false);

  readonly transactions = signal<TransactionResponse[]>([]);
  readonly transactionsLoading = signal(true);

  readonly loans = signal<LoanResponse[]>([]);
  readonly loansLoading = signal(true);

  readonly cards = signal<CardResponse[]>([]);
  readonly cardsLoading = signal(true);
  readonly cardActionInFlight = signal<number | null>(null);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.userNotFound.set(true);
      this.userLoading.set(false);
      return;
    }

    this.usersService.getById(id).subscribe({
      next: (user) => {
        this.user.set(user);
        this.userLoading.set(false);
      },
      error: () => {
        this.userNotFound.set(true);
        this.userLoading.set(false);
      },
    });

    this.accountsService.getByUserId(id).subscribe({
      next: (accounts) => {
        this.accounts.set(accounts);
        this.accountsLoading.set(false);
      },
      error: () => this.accountsLoading.set(false),
    });

    this.transactionsService.getByUserId(id).subscribe({
      next: (transactions) => {
        this.transactions.set(transactions);
        this.transactionsLoading.set(false);
      },
      error: () => this.transactionsLoading.set(false),
    });

    this.loansService.getByUserId(id).subscribe({
      next: (loans) => {
        this.loans.set(loans);
        this.loansLoading.set(false);
      },
      error: () => this.loansLoading.set(false),
    });

     this.cardsService.getByUserId(id).subscribe({
      next: (cards) => {
        this.cards.set(cards);
        this.cardsLoading.set(false);
      },
      error: () => this.cardsLoading.set(false),
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/users']);
  }
    toggleAccountFreeze(account: AccountResponse): void {
    this.accountActionInFlight.set(account.id);
    const action$ =
      account.accountStatus === 'FROZEN'
        ? this.accountsService.unfreeze(account.id)
        : this.accountsService.freeze(account.id);
    action$.subscribe({
      next: (updated) => {
        this.accountActionInFlight.set(null);
        this.patchLocalAccount(updated);
      },
      error: () => this.accountActionInFlight.set(null),
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
    this.accountsService.close(account.id).subscribe({
      next: (updated) => {
        this.closeSubmitting.set(false);
        this.patchLocalAccount(updated);
        this.closeTarget.set(null);
      },
      error: () => this.closeSubmitting.set(false),
    });
  }

  /** This view's accounts list came from a standalone getByUserId() call,
   *  not AdminAccountsService's own shared signal, so a successful
   *  freeze/unfreeze/close there doesn't automatically update what's
   *  shown here -- patch it locally instead. */
  private patchLocalAccount(updated: AccountResponse): void {
    this.accounts.update((list) => list.map((a) => (a.id === updated.id ? updated : a)));
  }

  statusSeverity(status: UserStatus): 'success' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'PENDING_KYC':
        return 'warn';
      case 'SUSPENDED':
      case 'CLOSED':
        return 'danger';
    }
  }

  roleSeverity(role: Role): 'secondary' | 'info' | 'contrast' {
    switch (role) {
      case 'ADMIN':
        return 'contrast';
      case 'TELLER':
        return 'info';
      case 'CUSTOMER':
        return 'secondary';
    }
  }

  accountStatusSeverity(status: AccountStatus): 'success' | 'warn' | 'danger' | 'secondary' {
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
  cardStatusSeverity(status: CardStatus): 'success' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'BLOCKED':
        return 'warn';
      case 'CANCELLED':
      case 'EXPIRED':
        return 'danger';
    }
  }

  toggleCardBlock(card: CardResponse): void {
    this.cardActionInFlight.set(card.id);
    const action$ = card.status === 'BLOCKED' ? this.cardsService.unblock(card.id) : this.cardsService.block(card.id);
    action$.subscribe({
      next: (updated) => {
        this.cardActionInFlight.set(null);
        this.cards.update((list) => list.map((c) => (c.id === updated.id ? updated : c)));
      },
      error: () => this.cardActionInFlight.set(null),
    });
  }
  transactionStatusSeverity(status: TransactionStatus): 'success' | 'danger' | 'secondary' {
    switch (status) {
      case 'SUCCESS':
        return 'success';
      case 'FAILED':
        return 'danger';
      case 'REVERSED':
        return 'secondary';
    }
  }

  loanStatusSeverity(status: LoanStatus): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
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