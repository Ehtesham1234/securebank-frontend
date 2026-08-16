import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, map , tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { API } from '../../core/constants/api-endpoints';
import { ApiResponse, PageResponse } from '../../core/models/api-response.model';
import { LoanApplicationRequest, LoanResponse } from '../../core/models/loan.model';

const BASE = environment.apiBaseUrl;

@Injectable({ providedIn: 'root' })
export class LoansService {
  private readonly http = inject(HttpClient);

  private readonly loansSignal = signal<LoanResponse[]>([]);
  readonly loans = this.loansSignal.asReadonly();

  private readonly loadingSignal = signal(true);
  readonly loading = this.loadingSignal.asReadonly();

  private readonly loadingMoreSignal = signal(false);
  readonly loadingMore = this.loadingMoreSignal.asReadonly();

  private readonly hasMoreSignal = signal(false);
  readonly hasMore = this.hasMoreSignal.asReadonly();

  private currentPage = 0;

  /** GET /loans/my — fetches page 0 fresh, replacing whatever was loaded
   *  before (as opposed to loadMore(), which appends). */
  refresh(): void {
    this.loadingSignal.set(true);
    this.currentPage = 0;
    this.fetchPage(0).subscribe({
      next: (page) => {
        this.loansSignal.set(page.content);
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
        this.loansSignal.update((list) => [...list, ...page.content]);
        this.currentPage = nextPage;
        this.hasMoreSignal.set(!page.last);
        this.loadingMoreSignal.set(false);
      },
      error: () => this.loadingMoreSignal.set(false),
    });
  }

  apply(request: LoanApplicationRequest): Observable<LoanResponse> {
    return this.http.post<ApiResponse<LoanResponse>>(`${BASE}${API.loans.apply}`, request).pipe(
      map((res) => res.data),
      // New applications are always PENDING and most-recent-first is the
      // backend's own default sort — prepending locally keeps that order
      // without a full refetch.
      map((loan) => {
        this.loansSignal.update((list) => [loan, ...list]);
        return loan;
      }),
    );
  }
  /** POST /loans/{id}/pay-emi. Unlike deposit/withdraw/transfer/pay-bill,
   *  this endpoint takes no amount (the backend charges the loan's fixed
   *  EMI amount) and no Idempotency-Key (LoanController genuinely doesn't
   *  declare that header for this one — not an oversight to "fix" here,
   *  just match the actual contract). It does need an X-Account-Id header
   *  — which of your accounts to debit — and as of when this was written,
   *  that header isn't in the gateway's CORS allowedHeaders list, so this
   *  call will fail as a browser-level CORS error until that's added
   *  server-side (see ApiGatewayApplication's CORS config). */
  payEmi(loanId: number, accountId: number): Observable<LoanResponse> {
    return this.http
      .post<ApiResponse<LoanResponse>>(
        `${BASE}${API.loans.payEmi(loanId)}`,
        {},
        { headers: { 'X-Account-Id': accountId.toString() } },
      )
      .pipe(
        map((res) => res.data),
        tap((loan) => this.patchLoan(loan)),
      );
  }

  private fetchPage(page: number): Observable<PageResponse<LoanResponse>> {
    return this.http
      .get<ApiResponse<PageResponse<LoanResponse>>>(`${BASE}${API.loans.mine}`, {
        params: { page: page.toString() },
      })
      .pipe(map((res) => res.data));
  }
  private patchLoan(updated: LoanResponse): void {
    this.loansSignal.update((list) => list.map((l) => (l.id === updated.id ? updated : l)));
  }
}