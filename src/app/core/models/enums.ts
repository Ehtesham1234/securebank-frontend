/**
 * Mirrors com.ehtesham.securebank.common.enums.Role
 */
export type Role = 'ADMIN' | 'TELLER' | 'CUSTOMER';

/**
 * Mirrors com.ehtesham.securebank.common.enums.UserStatus
 *
 * In practice, after a successful login the only statuses you'll ever see on
 * the JWT/AuthResponse are PENDING_KYC and ACTIVE — SUSPENDED and CLOSED
 * users are rejected at login by the backend (AccountSuspendedException /
 * AccountClosedException) before a token is ever issued.
 */
export type UserStatus = 'PENDING_KYC' | 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
