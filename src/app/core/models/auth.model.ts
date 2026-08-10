import { Role, UserStatus } from './enums';

/** POST /auth/register body. Note: no phoneNumber — that field is commented
 *  out on the backend DTO, so don't collect it. */
export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

/** POST /auth/register response payload (wrapped in ApiResponse). The
 *  backend deliberately returns this identical shape whether the email was
 *  new, already registered-but-unverified, or already fully registered —
 *  it never reveals which, to prevent account enumeration. For the two
 *  "already existed" paths it also echoes back the SUBMITTED request
 *  fields rather than the real account's data, and omits `id` entirely
 *  (a real id vs. a missing one would itself leak whether the email was
 *  new) — so `id` is only ever present for a genuinely new registration.
 *  Never brand the UI copy after this response as "success" vs. "already
 *  exists", and never read `id` off this response for anything. */
export interface UserResponse {
  id: number | null;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  userStatus: UserStatus;
  emailVerified: boolean;
}

/** POST /auth/login body */
export interface LoginRequest {
  email: string;
  password: string;
}

/** POST /auth/login and POST /auth/refresh response payload */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  userStatus: UserStatus;
  role: Role;
}

/** POST /auth/refresh and POST /auth/logout body */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/** POST /auth/forgot-password and POST /auth/email/send-otp body */
export interface EmailOnlyRequest {
  email: string;
}

/** POST /auth/reset-password body */
export interface ResetPasswordRequest {
  email: string;
  otp: string;
  newPassword: string;
}

/** POST /auth/email/verify body */
export interface VerifyEmailRequest {
  email: string;
  otp: string;
}

/**
 * Decoded shape of the access token payload (see securebank-api's
 * JwtService). Only email, role, userId and userStatus are embedded — there
 * is no firstName/lastName on the token and no GET /me endpoint exposed
 * through the gateway, so the UI has no way to recover a display name after
 * a plain login. We show the email as the identity string instead.
 */
export interface DecodedAccessToken {
  sub: string; // email
  role: Role;
  userId: number;
  userStatus: UserStatus;
  iat: number;
  exp: number;
}
