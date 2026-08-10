import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { jwtDecode } from 'jwt-decode';
import { Observable, catchError, map, of, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { API } from '../constants/api-endpoints';
import { ApiResponse } from '../models/api-response.model';
import {
  AuthResponse,
  DecodedAccessToken,
  EmailOnlyRequest,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
  UserResponse,
  VerifyEmailRequest,
} from '../models/auth.model';
import { Role, UserStatus } from '../models/enums';
import { TokenStorageService } from './token-storage.service';

export interface CurrentUser {
  email: string;
  userId: number;
  role: Role;
  userStatus: UserStatus;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokens = inject(TokenStorageService);

  /** Derived from whatever access token is currently in memory. Null means
   *  "not authenticated" — either never logged in, or the silent refresh on
   *  boot failed/hasn't resolved yet. */
  private readonly currentUserSignal = signal<CurrentUser | null>(null);
  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUserSignal() !== null);

  /** Flips true once the boot-time silent-refresh attempt has settled
   *  (whichever way). Guards wait on this so they don't redirect to /login
   *  on a hard reload before the refresh had a chance to run. */
  private readonly readySignal = signal(false);
  readonly ready = this.readySignal.asReadonly();

  register(request: RegisterRequest): Observable<UserResponse> {
    return this.http
      .post<ApiResponse<UserResponse>>(`${environment.apiBaseUrl}${API.auth.register}`, request)
      .pipe(map((res) => res.data));
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<ApiResponse<AuthResponse>>(`${environment.apiBaseUrl}${API.auth.login}`, request)
      .pipe(tap((res) => this.applySession(res.data)), map((res) => res.data));
  }

  logout(): Observable<void> {
    const refreshToken = this.tokens.getRefreshToken();
    this.clearSession();
    if (!refreshToken) {
      return of(void 0);
    }
    // Best-effort: tell the backend to revoke the refresh token, but the
    // client-side session is already cleared regardless of the outcome —
    // a failed logout call should never trap the user in a "still logged
    // in" UI.
    return this.http
      .post<ApiResponse<void>>(`${environment.apiBaseUrl}${API.auth.logout}`, { refreshToken })
      .pipe(
        map(() => void 0),
        catchError(() => of(void 0)),
      );
  }

  forgotPassword(request: EmailOnlyRequest): Observable<void> {
    return this.http
      .post<ApiResponse<void>>(`${environment.apiBaseUrl}${API.auth.forgotPassword}`, request)
      .pipe(map(() => void 0));
  }

  resetPassword(request: ResetPasswordRequest): Observable<void> {
    return this.http
      .post<ApiResponse<void>>(`${environment.apiBaseUrl}${API.auth.resetPassword}`, request)
      .pipe(map(() => void 0));
  }

  sendEmailOtp(request: EmailOnlyRequest): Observable<void> {
    return this.http
      .post<ApiResponse<void>>(`${environment.apiBaseUrl}${API.auth.sendEmailOtp}`, request)
      .pipe(map(() => void 0));
  }

  verifyEmail(request: VerifyEmailRequest): Observable<void> {
    return this.http
      .post<ApiResponse<void>>(`${environment.apiBaseUrl}${API.auth.verifyEmail}`, request)
      .pipe(map(() => void 0));
  }

  /**
   * Called once from app.config.ts's APP_INITIALIZER. Attempts a silent
   * refresh using whatever refresh token is in localStorage so a page
   * reload doesn't force a fresh login. Never throws — any failure just
   * leaves the user logged out.
   */
  initFromStorage(): Observable<void> {
    const refreshToken = this.tokens.getRefreshToken();
    if (!refreshToken) {
      this.readySignal.set(true);
      return of(void 0);
    }
    return this.refreshAccessToken().pipe(
      map(() => void 0),
      catchError(() => {
        this.clearSession();
        return of(void 0);
      }),
      tap(() => this.readySignal.set(true)),
    );
  }

  /**
   * Exchanges the stored refresh token for a new access/refresh pair. Used
   * both on app boot (see initFromStorage) and by the auth interceptor when
   * a request comes back 401.
   */
  refreshAccessToken(): Observable<AuthResponse> {
    const refreshToken = this.tokens.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }
    return this.http
      .post<ApiResponse<AuthResponse>>(`${environment.apiBaseUrl}${API.auth.refresh}`, {
        refreshToken,
      })
      .pipe(tap((res) => this.applySession(res.data)), map((res) => res.data));
  }

  /**
   * Clears local session state WITHOUT calling /auth/logout — for callers
   * that already triggered server-side revocation through a different
   * endpoint (e.g. AccountSecurityService.logoutAllDevices, which revokes
   * every session including this one). Calling regular logout() afterward
   * would just be a redundant network request against an already-revoked
   * refresh token.
   */
  clearLocalSession(): void {
    this.clearSession();
  }

  private applySession(auth: AuthResponse): void {
    this.tokens.setAccessToken(auth.accessToken);
    this.tokens.setSession(auth.refreshToken, auth.role, auth.userStatus);
    this.currentUserSignal.set(this.decode(auth.accessToken));
  }

  private clearSession(): void {
    this.tokens.clear();
    this.currentUserSignal.set(null);
  }

  private decode(accessToken: string): CurrentUser | null {
    try {
      const payload = jwtDecode<DecodedAccessToken>(accessToken);
      return {
        email: payload.sub,
        userId: payload.userId,
        role: payload.role,
        userStatus: payload.userStatus,
      };
    } catch {
      return null;
    }
  }
}
