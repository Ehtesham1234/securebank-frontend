import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../core/models/api-response.model';
import { ActiveSession } from '../../core/models/session.model';

const BASE = `${environment.apiBaseUrl}/account-security`;

@Injectable({ providedIn: 'root' })
export class AccountSecurityService {
  private readonly http = inject(HttpClient);

  private readonly sessionsSignal = signal<ActiveSession[]>([]);
  readonly sessions = this.sessionsSignal.asReadonly();

  private readonly loadingSignal = signal(false);
  readonly loading = this.loadingSignal.asReadonly();

  /** Fire-and-forget refresh — the component reads `sessions`/`loading`
   *  signals rather than subscribing itself. */
  refresh(): void {
    this.loadingSignal.set(true);
    this.http.get<ApiResponse<ActiveSession[]>>(`${BASE}/sessions`).subscribe({
      next: (res) => {
        this.sessionsSignal.set(res.data);
        this.loadingSignal.set(false);
      },
      error: () => this.loadingSignal.set(false),
    });
  }

  revoke(tokenFamily: string): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${BASE}/sessions/${encodeURIComponent(tokenFamily)}`)
      .pipe(
        tap(() =>
          this.sessionsSignal.update((list) =>
            list.filter((s) => s.tokenFamily !== tokenFamily),
          ),
        ),
        map(() => void 0),
      );
  }

  /** Revokes every session for this user, including the one making the
   *  call. The component is responsible for clearing local auth state and
   *  redirecting to login afterward — see AuthService.clearLocalSession. */
  logoutAllDevices(): Observable<void> {
    return this.http
      .post<ApiResponse<void>>(`${BASE}/logout-all-devices`, {})
      .pipe(map(() => void 0));
  }
}
