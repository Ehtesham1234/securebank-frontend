/**
 * Mirrors com.ehtesham.securebank.auth.dto.ActiveSessionResponse.
 *
 * Deliberately sparse — the backend doesn't return device name, browser, IP,
 * or location, just the refresh token's family id and its lifetime. Don't
 * fabricate "Chrome on Windows"-style device labels in the UI; show what's
 * actually there (a session identifier + timestamps) and be honest about it.
 */
export interface ActiveSession {
  tokenFamily: string;
  createdAt: string;
  expiresAt: string;
  currentSession: boolean;
}
