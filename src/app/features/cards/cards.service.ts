import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { API } from '../../core/constants/api-endpoints';
import { ApiResponse } from '../../core/models/api-response.model';
import { CardResponse, CvvResponse } from '../../core/models/card.model';
import { withIdempotencyKey } from '../../core/interceptors/idempotency.interceptor';

const BASE = environment.apiBaseUrl;

@Injectable({ providedIn: 'root' })
export class CardsService {
  private readonly http = inject(HttpClient);

  private readonly cardsSignal = signal<CardResponse[]>([]);
  readonly cards = this.cardsSignal.asReadonly();

  private readonly loadingSignal = signal(true);
  readonly loading = this.loadingSignal.asReadonly();

  refresh(): void {
    this.loadingSignal.set(true);
    this.http
      .get<ApiResponse<CardResponse[]>>(`${BASE}${API.cards.mine}`)
      .pipe(map((res) => res.data))
      .subscribe({
        next: (list) => {
          this.cardsSignal.set(list);
          this.loadingSignal.set(false);
        },
        error: () => this.loadingSignal.set(false),
      });
  }

  block(cardId: number): Observable<CardResponse> {
    return this.http.post<ApiResponse<CardResponse>>(`${BASE}${API.cards.block(cardId)}`, {}).pipe(
      map((res) => res.data),
      tap((card) => this.patchCard(card)),
    );
  }

  unblock(cardId: number): Observable<CardResponse> {
    return this.http.post<ApiResponse<CardResponse>>(`${BASE}${API.cards.unblock(cardId)}`, {}).pipe(
      map((res) => res.data),
      tap((card) => this.patchCard(card)),
    );
  }

  /** GET /cards/{id}/cvv — the backend derives this on demand and never
   *  stores it (see the CardController comment on revealCvv). Mirror that
   *  discipline client-side: this deliberately does NOT cache the result
   *  in a signal the way cards/accounts do — the component holds it only
   *  as long as the reveal toggle is on, then discards it. */
  getCvv(cardId: number): Observable<CvvResponse> {
    return this.http
      .get<ApiResponse<CvvResponse>>(`${BASE}${API.cards.cvv(cardId)}`)
      .pipe(map((res) => res.data));
  }

  /** pay-bill takes `amount` as a query parameter, not a JSON body — that's
   *  the backend's actual contract (CardController uses @RequestParam, not
   *  @RequestBody, for this one endpoint). Requires Idempotency-Key. */
  payBill(cardId: number, amount: number): Observable<CardResponse> {
    return this.http
      .post<ApiResponse<CardResponse>>(`${BASE}${API.cards.payBill(cardId)}`, null, {
        params: { amount: amount.toString() },
        context: withIdempotencyKey(),
      })
      .pipe(
        map((res) => res.data),
        tap((card) => this.patchCard(card)),
      );
  }

  private patchCard(updated: CardResponse): void {
    this.cardsSignal.update((list) => list.map((c) => (c.id === updated.id ? updated : c)));
  }
}