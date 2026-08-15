import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { API } from '../../core/constants/api-endpoints';
import { ApiResponse } from '../../core/models/api-response.model';
import { DepositRequest, TransactionResponse } from '../../core/models/account.model';
import { withIdempotencyKey } from '../../core/interceptors/idempotency.interceptor';

const BASE = environment.apiBaseUrl;

/**
 * Lives alongside AccountsService for now since deposit is triggered
 * contextually from the accounts screen — promote to its own
 * features/transactions/ folder once withdraw/transfer/history (Part 3+)
 * grow this out into something bigger.
 */
@Injectable({ providedIn: 'root' })
export class TransactionsService {
  private readonly http = inject(HttpClient);

  /** Every money-moving call needs an Idempotency-Key — withIdempotencyKey()
   *  generates one automatically per request (see
   *  core/interceptors/idempotency.interceptor.ts). Without this context,
   *  the backend rejects the request outright (it's a required header, not
   *  just recommended). */
  deposit(accountId: number, request: DepositRequest): Observable<TransactionResponse> {
    return this.http
      .post<ApiResponse<TransactionResponse>>(
        `${BASE}${API.transactions.deposit(accountId)}`,
        request,
        { context: withIdempotencyKey() },
      )
      .pipe(map((res) => res.data));
  }
}