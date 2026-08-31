import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { API } from '../../core/constants/api-endpoints';
import { ApiResponse, PageResponse } from '../../core/models/api-response.model';
import { TransactionResponse } from '../../core/models/account.model';

const BASE = environment.apiBaseUrl;
/** Mirrors the backend's unambiguous admin/transactions query params. */
export type AdminTransactionSearchField =
  | 'userId'
  | 'transactionId'
  | 'transactionRef'
  | 'accountNumber'
  | 'search';
@Injectable({ providedIn: 'root' })
export class AdminTransactionsService {
  private readonly http = inject(HttpClient);

  private readonly transactionsSignal = signal<TransactionResponse[]>([]);
  readonly transactions = this.transactionsSignal.asReadonly();

  private readonly loadingSignal = signal(true);
  readonly loading = this.loadingSignal.asReadonly();

  private readonly loadingMoreSignal = signal(false);
  readonly loadingMore = this.loadingMoreSignal.asReadonly();

  private readonly hasMoreSignal = signal(false);
  readonly hasMore = this.hasMoreSignal.asReadonly();

  private currentPage = 0;
  private currentField?: AdminTransactionSearchField;
  private currentValue?: string;
    /** GET /admin/transactions — bank-wide, paginated server-side (default
   *  page size 20), or scoped to exactly one field when a search is
   *  given. Same load-more pattern as LoansService; the search terms
   *  persist across loadMore() calls via currentField/currentValue. */
  refresh(field?: AdminTransactionSearchField, value?: string): void {
    this.loadingSignal.set(true);
    this.currentPage = 0;
    this.currentField = field;
    this.currentValue = value;
    this.fetchPage(0).subscribe({
      next: (page) => {
        this.transactionsSignal.set(page.content);
        this.hasMoreSignal.set(!page.last);
        this.loadingSignal.set(false);
      },
      error: () => this.loadingSignal.set(false),
    });
  }

  loadMore(): void {
    const nextPage = this.currentPage + 1;
    this.loadingMoreSignal.set(true);
    this.fetchPage(nextPage).subscribe({
      next: (page) => {
        this.transactionsSignal.update((list) => [...list, ...page.content]);
        this.currentPage = nextPage;
        this.hasMoreSignal.set(!page.last);
        this.loadingMoreSignal.set(false);
      },
      error: () => this.loadingMoreSignal.set(false),
    });
  }

  reverse(id: number): Observable<TransactionResponse> {
    return this.http
      .post<ApiResponse<TransactionResponse>>(`${BASE}${API.adminTransactions.reverse(id)}`, {})
      .pipe(
        map((res) => res.data),
        tap((updated) => this.patchTransaction(updated)),
      );
  }
  private fetchPage(page: number): Observable<PageResponse<TransactionResponse>> {
    const params: Record<string, string> = { page: page.toString() };
    if (this.currentField && this.currentValue && this.currentValue.trim()) {
      params[this.currentField] = this.currentValue.trim();
    }
    return this.http
      .get<ApiResponse<PageResponse<TransactionResponse>>>(`${BASE}${API.adminTransactions.all}`, { params })
      .pipe(map((res) => res.data));
  }

  private patchTransaction(updated: TransactionResponse): void {
    this.transactionsSignal.update((list) => list.map((t) => (t.id === updated.id ? updated : t)));
  }
    /** For the admin user-detail view — just the first page (most recent
   *  20) for one customer, deliberately not touching transactionsSignal
   *  (that's reserved for the bank-wide "All Transactions" list this
   *  service also backs). */
  getByUserId(userId: number): Observable<TransactionResponse[]> {
    return this.http
      .get<ApiResponse<PageResponse<TransactionResponse>>>(`${BASE}${API.adminTransactions.all}`, {
        params: { userId: userId.toString(), page: '0' },
      })
      .pipe(map((res) => res.data.content));
  }
}