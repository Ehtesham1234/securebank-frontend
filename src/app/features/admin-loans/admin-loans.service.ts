import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { API } from '../../core/constants/api-endpoints';
import { ApiResponse, PageResponse } from '../../core/models/api-response.model';
import { LoanResponse, LoanReviewRequest } from '../../core/models/loan.model';

const BASE = environment.apiBaseUrl;

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

  private removeFromPending(id: number): void {
    this.pendingSignal.update((list) => list.filter((l) => l.id !== id));
  }
}