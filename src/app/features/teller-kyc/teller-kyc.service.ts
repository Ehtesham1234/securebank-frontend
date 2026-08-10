import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { API } from '../../core/constants/api-endpoints';
import { ApiResponse } from '../../core/models/api-response.model';
import { KycRejectRequest, KycResponse } from '../../core/models/kyc.model';

const BASE = environment.apiBaseUrl;

@Injectable({ providedIn: 'root' })
export class TellerKycService {
  private readonly http = inject(HttpClient);

  private readonly pendingSignal = signal<KycResponse[]>([]);
  readonly pending = this.pendingSignal.asReadonly();

  private readonly loadingSignal = signal(true);
  readonly loading = this.loadingSignal.asReadonly();

  refresh(): void {
    this.loadingSignal.set(true);
    this.http
      .get<ApiResponse<KycResponse[]>>(`${BASE}${API.teller.pendingKyc}`)
      .pipe(map((res) => res.data))
      .subscribe({
        next: (list) => {
          this.pendingSignal.set(list);
          this.loadingSignal.set(false);
        },
        error: () => this.loadingSignal.set(false),
      });
  }

  verify(id: number): Observable<KycResponse> {
    return this.http.post<ApiResponse<KycResponse>>(`${BASE}${API.teller.verifyKyc(id)}`, {}).pipe(
      map((res) => res.data),
      tap(() => this.removeFromPending(id)),
    );
  }

  reject(id: number, reason: string): Observable<KycResponse> {
    const body: KycRejectRequest = { reason };
    return this.http.post<ApiResponse<KycResponse>>(`${BASE}${API.teller.rejectKyc(id)}`, body).pipe(
      map((res) => res.data),
      tap(() => this.removeFromPending(id)),
    );
  }

  /** Optimistic local removal — verify()/reject() already succeeded server-
   *  side by the time this runs, so there's no need for a fresh refresh()
   *  round trip just to reflect what we already know happened. */
  private removeFromPending(id: number): void {
    this.pendingSignal.update((list) => list.filter((k) => k.id !== id));
  }
}
