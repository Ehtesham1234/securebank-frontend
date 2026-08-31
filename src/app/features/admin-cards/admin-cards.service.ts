import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, map , tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { API } from '../../core/constants/api-endpoints';
import { ApiResponse } from '../../core/models/api-response.model';
import { CardResponse } from '../../core/models/card.model';
const BASE = environment.apiBaseUrl;

export type AdminCardSearchField = 'userId' | 'cardId' | 'maskedNumber' | 'search';

@Injectable({ providedIn: 'root' })
export class AdminCardsService {
  private readonly http = inject(HttpClient);

  private readonly cardsSignal = signal<CardResponse[]>([]);
  readonly cards = this.cardsSignal.asReadonly();

  private readonly loadingSignal = signal(true);
  readonly loading = this.loadingSignal.asReadonly();

  /** GET /cards/admin — every card across every customer, bank-wide, or
   *  scoped to exactly one field when a search is given. */
  refresh(field?: AdminCardSearchField, value?: string): void {
    this.loadingSignal.set(true);
    const params: Record<string, string> = {};
    if (field && value && value.trim()) {
      params[field] = value.trim();
    }
    this.http
      .get<ApiResponse<CardResponse[]>>(`${BASE}${API.adminCards.all}`, { params })
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
    return this.http
      .post<ApiResponse<CardResponse>>(`${BASE}${API.adminCards.block(cardId)}`, {})
      .pipe(
        map((res) => res.data),
        tap((card) => this.patchCard(card)),
      );
  }

  unblock(cardId: number): Observable<CardResponse> {
    return this.http
      .post<ApiResponse<CardResponse>>(`${BASE}${API.adminCards.unblock(cardId)}`, {})
      .pipe(
        map((res) => res.data),
        tap((card) => this.patchCard(card)),
      );
  }

  /** For the admin user-detail view — a plain fetch scoped to one
   *  customer, deliberately not touching cardsSignal (that's reserved
   *  for the bank-wide "All Cards" list this service also backs). */
  getByUserId(userId: number): Observable<CardResponse[]> {
    return this.http
      .get<ApiResponse<CardResponse[]>>(`${BASE}${API.adminCards.all}`, {
        params: { userId: userId.toString() },
      })
      .pipe(map((res) => res.data));
  }

  private patchCard(updated: CardResponse): void {
    this.cardsSignal.update((list) => list.map((c) => (c.id === updated.id ? updated : c)));
  }
}