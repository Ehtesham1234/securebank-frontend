import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { API } from '../../core/constants/api-endpoints';
import { ApiResponse } from '../../core/models/api-response.model';
import { AccountResponse } from '../../core/models/account.model';

const BASE = environment.apiBaseUrl;

@Injectable({ providedIn: 'root' })
export class AdminAccountsService {
  private readonly http = inject(HttpClient);

  private readonly accountsSignal = signal<AccountResponse[]>([]);
  readonly accounts = this.accountsSignal.asReadonly();

  private readonly loadingSignal = signal(true);
  readonly loading = this.loadingSignal.asReadonly();

  /** GET /admin/accounts — every account across every customer, bank-wide.
   *  Reuses the same AccountResponse model as the customer-facing
   *  accounts feature; the shape is identical, only who's allowed to call
   *  it differs. */
  refresh(): void {
    this.loadingSignal.set(true);
    this.http
      .get<ApiResponse<AccountResponse[]>>(`${BASE}${API.adminAccounts.all}`)
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
}