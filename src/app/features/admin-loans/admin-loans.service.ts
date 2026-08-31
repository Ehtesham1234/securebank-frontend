import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { API } from '../../core/constants/api-endpoints';
import { ApiResponse, PageResponse } from '../../core/models/api-response.model';
import { LoanResponse, LoanReviewRequest } from '../../core/models/loan.model';

const BASE = environment.apiBaseUrl;
/** Mirrors the backend's unambiguous admin/loans query params, for the
 *  "All Loans" browse page below (separate from the pending-review
 *  queue this service also backs). */
export type AdminLoanSearchField = 'userId' | 'loanId' | 'loanRef' | 'search';
/**
 * ADMIN-only, despite loan-service allowing TELLER to approve/reject by id
 * — GET /admin/loans/status/{status} itself is @PreAuthorize'd to
 * ROLE_ADMIN only, and there's no TELLER-scoped equivalent (unlike KYC,
 * which has GET /teller/kyc/pending). A TELLER can technically call
 * approve()/reject() on a loan id they already know, but has no way to
 * discover pending loan ids through this API at all. Worth adding a
 * teller-scoped listing endpoint on the backend if TELLER loan review is
 * meant to actually work day to day.
 */
@Injectable({ providedIn: 'root' })
export class AdminLoansService {
  private readonly http = inject(HttpClient);

  private readonly pendingSignal = signal<LoanResponse[]>([]);
  readonly pending = this.pendingSignal.asReadonly();

  private readonly loadingSignal = signal(true);
  readonly loading = this.loadingSignal.asReadonly();

  refresh(): void {
    this.loadingSignal.set(true);
    this.http
      .get<ApiResponse<PageResponse<LoanResponse>>>(`${BASE}${API.loans.byStatus('PENDING')}`)
      .pipe(map((res) => res.data.content))
      .subscribe({
        next: (list) => {
          this.pendingSignal.set(list);
          this.loadingSignal.set(false);
        },
        error: () => this.loadingSignal.set(false),
      });
  }

  approve(id: number, request: LoanReviewRequest): Observable<LoanResponse> {
    return this.http
      .post<ApiResponse<LoanResponse>>(`${BASE}${API.loans.approve(id)}`, request)
      .pipe(
        map((res) => res.data),
        tap(() => this.removeFromPending(id)),
      );
  }

  reject(id: number, request: LoanReviewRequest): Observable<LoanResponse> {
    return this.http
      .post<ApiResponse<LoanResponse>>(`${BASE}${API.loans.reject(id)}`, request)
      .pipe(
        map((res) => res.data),
        tap(() => this.removeFromPending(id)),
      );
  }
  
    /** For the admin user-detail view — one customer's loans (any status),
   *  via the general admin listing rather than the status-scoped pending
   *  queue this service otherwise backs. Just the first page (most
   *  recent 20) — loans per customer are rarely more than a handful, so
   *  full pagination here isn't worth the added UI complexity. */
  getByUserId(userId: number): Observable<LoanResponse[]> {
    return this.http
      .get<ApiResponse<PageResponse<LoanResponse>>>(`${BASE}${API.loans.adminAll}`, {
        params: { userId: userId.toString(), page: '0' },
      })
      .pipe(map((res) => res.data.content));
  }

  // --- "All Loans" browse page — bank-wide, any status, paginated,
  // searchable. Separate signals from `pending` above since these back a
  // genuinely different screen (browse everything vs. review a queue).

  private readonly allLoansSignal = signal<LoanResponse[]>([]);
  readonly allLoans = this.allLoansSignal.asReadonly();

  private readonly allLoansLoadingSignal = signal(true);
  readonly allLoansLoading = this.allLoansLoadingSignal.asReadonly();

  private readonly allLoansLoadingMoreSignal = signal(false);
  readonly allLoansLoadingMore = this.allLoansLoadingMoreSignal.asReadonly();

  private readonly allLoansHasMoreSignal = signal(false);
  readonly allLoansHasMore = this.allLoansHasMoreSignal.asReadonly();

  private allLoansPage = 0;
  private allLoansField?: AdminLoanSearchField;
  private allLoansValue?: string;

  refreshAll(field?: AdminLoanSearchField, value?: string): void {
    this.allLoansLoadingSignal.set(true);
    this.allLoansPage = 0;
    this.allLoansField = field;
    this.allLoansValue = value;
    this.fetchAllPage(0).subscribe({
      next: (page) => {
        this.allLoansSignal.set(page.content);
        this.allLoansHasMoreSignal.set(!page.last);
        this.allLoansLoadingSignal.set(false);
      },
      error: () => this.allLoansLoadingSignal.set(false),
    });
  }

  loadMoreAll(): void {
    const nextPage = this.allLoansPage + 1;
    this.allLoansLoadingMoreSignal.set(true);
    this.fetchAllPage(nextPage).subscribe({
      next: (page) => {
        this.allLoansSignal.update((list) => [...list, ...page.content]);
        this.allLoansPage = nextPage;
        this.allLoansHasMoreSignal.set(!page.last);
        this.allLoansLoadingMoreSignal.set(false);
      },
      error: () => this.allLoansLoadingMoreSignal.set(false),
    });
  }

  private fetchAllPage(page: number): Observable<PageResponse<LoanResponse>> {
    const params: Record<string, string> = { page: page.toString() };
    if (this.allLoansField && this.allLoansValue && this.allLoansValue.trim()) {
      params[this.allLoansField] = this.allLoansValue.trim();
    }
    return this.http
      .get<ApiResponse<PageResponse<LoanResponse>>>(`${BASE}${API.loans.adminAll}`, { params })
      .pipe(map((res) => res.data));
  }
  private removeFromPending(id: number): void {
    this.pendingSignal.update((list) => list.filter((l) => l.id !== id));
  }
  
}