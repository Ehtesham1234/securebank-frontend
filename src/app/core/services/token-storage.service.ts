import { Injectable, signal } from '@angular/core';
import { Role, UserStatus } from '../models/enums';

const REFRESH_TOKEN_KEY = 'sb.refreshToken';
const ROLE_KEY = 'sb.role';
const STATUS_KEY = 'sb.userStatus';

/**
 * Where the auth tokens live, and why they're split like this:
 *
 * - Access token: kept ONLY in memory (a signal). It never touches
 *   localStorage, so it can't be read back out by a persisted XSS payload
 *   or by another script inspecting storage. Cost: a hard page reload loses
 *   it, which is why AuthService does a silent refresh on app init.
 *
 * - Refresh token: persisted in localStorage so the session survives a
 *   reload/new tab. This is a real trade-off — a stored refresh token IS
 *   readable by injected script — but the backend's contract returns both
 *   tokens in the JSON body rather than setting an httpOnly cookie, so
 *   client-side storage of some kind is unavoidable given the current API.
 *   If the backend adds httpOnly-cookie-based refresh later, this is the
 *   only file that needs to change.
 *
 * - role/userStatus: mirrored into localStorage alongside the refresh token
 *   purely so guards can make a synchronous best-effort decision before the
 *   silent refresh resolves (e.g. deciding whether to even attempt a
 *   protected route). They are NOT the source of truth once a fresh access
 *   token exists — decode the token for that (see AuthService).
 */
@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  private readonly accessTokenSignal = signal<string | null>(null);
  readonly accessToken = this.accessTokenSignal.asReadonly();

  setAccessToken(token: string | null): void {
    this.accessTokenSignal.set(token);
  }

  getAccessToken(): string | null {
    return this.accessTokenSignal();
  }

  setSession(refreshToken: string, role: Role, userStatus: UserStatus): void {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    localStorage.setItem(ROLE_KEY, role);
    localStorage.setItem(STATUS_KEY, userStatus);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  getPersistedRole(): Role | null {
    return localStorage.getItem(ROLE_KEY) as Role | null;
  }

  getPersistedStatus(): UserStatus | null {
    return localStorage.getItem(STATUS_KEY) as UserStatus | null;
  }

  clear(): void {
    this.accessTokenSignal.set(null);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(STATUS_KEY);
  }
}
