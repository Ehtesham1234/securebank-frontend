import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { API } from '../../core/constants/api-endpoints';
import { ApiResponse } from '../../core/models/api-response.model';
import { AccountResponse } from '../../core/models/account.model';

const BASE = environment.apiBaseUrl;
/** Mirrors the backend's now-unambiguous admin/accounts query params —
 *  each one means exactly one thing, no overlap between "this account's
 *  own id/number" and "the owning user's id/name". */
export type AdminAccountSearchField = 'userId' | 'accountId' | 'accountNumber' | 'search';

@Injectable({ providedIn: 'root' })
export class AdminAccountsService {
  private readonly http = inject(HttpClient);

  private readonly accountsSignal = signal<AccountResponse[]>([]);
  readonly accounts = this.accountsSignal.asReadonly();

  private readonly loadingSignal = signal(true);
  readonly loading = this.loadingSignal.asReadonly();

  /** GET /admin/accounts — every account across every customer, bank-wide,
   *  or scoped to exactly one field when a search is given. field/value
   *  must both be present to filter — calling with no args (or clearing
   *  the search) returns everything, same as before. */
  refresh(field?: AdminAccountSearchField, value?: string): void {
    this.loadingSignal.set(true);
    const params: Record<string, string> = {};
    if (field && value && value.trim()) {
      params[field] = value.trim();
    }
    this.http
      .get<ApiResponse<AccountResponse[]>>(`${BASE}${API.adminAccounts.all}`, { params })
      .pipe(map((res) => res.data))
      .subscribe({
        next: (list) => {
          this.accountsSignal.set(list);
          this.loadingSignal.set(false);
        },
        error: () => this.loadingSignal.set(false),
      });
  }

  freeze(id: number): Observable<AccountResponse> {
    return this.http
      .post<ApiResponse<AccountResponse>>(`${BASE}${API.adminAccounts.freeze(id)}`, {})
      .pipe(
        map((res) => res.data),
        tap((account) => this.patchAccount(account)),
      );
  }

  unfreeze(id: number): Observable<AccountResponse> {
    return this.http
      .post<ApiResponse<AccountResponse>>(`${BASE}${API.adminAccounts.unfreeze(id)}`, {})
      .pipe(
        map((res) => res.data),
        tap((account) => this.patchAccount(account)),
      );
  }

  close(id: number): Observable<AccountResponse> {
    return this.http
      .post<ApiResponse<AccountResponse>>(`${BASE}${API.adminAccounts.close(id)}`, {})
      .pipe(
        map((res) => res.data),
        tap((account) => this.patchAccount(account)),
      );
  }

  private patchAccount(updated: AccountResponse): void {
    this.accountsSignal.update((list) => list.map((a) => (a.id === updated.id ? updated : a)));
  }
    /** For the admin user-detail view — a plain fetch scoped to one
   *  customer, deliberately not touching accountsSignal (that's reserved
   *  for the bank-wide "All Accounts" list this service also backs). */
  getByUserId(userId: number): Observable<AccountResponse[]> {
    return this.http
      .get<ApiResponse<AccountResponse[]>>(`${BASE}${API.adminAccounts.all}`, {
        params: { userId: userId.toString() },
      })
      .pipe(map((res) => res.data));
  }
}