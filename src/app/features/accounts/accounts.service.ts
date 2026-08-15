import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { API } from '../../core/constants/api-endpoints';
import { ApiResponse } from '../../core/models/api-response.model';
import { AccountApplicationRequest, AccountResponse } from '../../core/models/account.model';

const BASE = environment.apiBaseUrl;

@Injectable({ providedIn: 'root' })
export class AccountsService {
  private readonly http = inject(HttpClient);

  private readonly accountsSignal = signal<AccountResponse[]>([]);
  readonly accounts = this.accountsSignal.asReadonly();

  private readonly loadingSignal = signal(true);
  readonly loading = this.loadingSignal.asReadonly();

  /** GET /accounts — every account the current customer owns (the savings
   *  account KYC auto-created, plus anything they've applied for since). */
  refresh(): void {
    this.loadingSignal.set(true);
    this.http
      .get<ApiResponse<AccountResponse[]>>(`${BASE}${API.accounts.mine}`)
      .pipe(map((res) => res.data))
      .subscribe({
        next: (list) => {
          this.accountsSignal.set(list);
          this.loadingSignal.set(false);
        },
        error: () => this.loadingSignal.set(false),
      });
  }

  /** GET /accounts/{id} — used by the detail view; not cached against the
   *  list signal since a single account's balance can be more current than
   *  whatever the last refresh() fetched. */
  getById(id: number): Observable<AccountResponse> {
    return this.http
      .get<ApiResponse<AccountResponse>>(`${BASE}${API.accounts.byId(id)}`)
      .pipe(map((res) => res.data));
  }

  /** POST /accounts/apply. On success, appends the new account to the
   *  local list so the accounts screen updates without a full refresh(). */
  apply(request: AccountApplicationRequest): Observable<AccountResponse> {
    return this.http.post<ApiResponse<AccountResponse>>(`${BASE}${API.accounts.apply}`, request).pipe(
      map((res) => res.data),
      tap((account) => this.accountsSignal.update((list) => [...list, account])),
    );
  }
    applyBalanceUpdate(accountId: number, newBalance: number): void {
    this.accountsSignal.update((list) =>
      list.map((acc) => (acc.id === accountId ? { ...acc, balance: newBalance } : acc)),
    );
  }
}