/**
 * Mirrors com.ehtesham.securebank.common.response.ApiResponse<T>.
 * Every successful 2xx response from every service is wrapped in this shape.
 */
export interface ApiResponse<T> {
  success: boolean;
  status: number;
  message: string;
  data: T;
  timestamp: string;
}
/** Shape of a Spring Data Page<T> as it serializes to JSON — this is what
 *  `data` holds for any endpoint typed as Page<T> on the backend (loans,
 *  and any future paginated admin list). Only the fields this app actually
 *  reads are declared; a real Page has more (pageable, sort, etc.) that
 *  nothing here needs. */
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number; // current page, 0-indexed
  size: number;
  first: boolean;
  last: boolean;
}

/**
 * Mirrors com.ehtesham.securebank.common.response.ErrorResponse.
 * Every non-2xx response from every service is wrapped in this shape
 * (see GlobalExceptionHandler in each service). `validationErrors` is only
 * present for 400s coming from @Valid request-body failures.
 */
export interface ErrorResponse {
  success: false;
  status: number;
  error: string;
  message: string;
  path: string;
  timestamp: string;
  validationErrors?: Record<string, string>;
}

/**
 * The backend error codes we branch on in the UI. Not exhaustive of every
 * @ExceptionHandler in every service, but covers everything Phase 1 (auth +
 * shell) needs to react to specifically rather than show a generic toast.
 */
export type KnownErrorCode =
  | 'VALIDATION_FAILED'
  | 'CONFLICT'
  | 'UNAUTHORIZED'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_REUSE_DETECTED'
  | 'INVALID_OTP'
  | 'INVALID_ROLE'
  | 'KYC_NOT_VERIFIED'
  | 'ACCOUNT_SUSPENDED'
  | 'ACCOUNT_CLOSED'
  | 'ACCOUNT_LOCKED'
  | 'ACCOUNT_DISABLED'
  | 'EMAIL_NOT_VERIFIED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'RESOURCE_NOT_FOUND'
  | 'NOT_FOUND' // kyc-service's spelling of the same concept as RESOURCE_NOT_FOUND
  | 'BAD_REQUEST' // kyc-service's generic-operation-failed code (KycOperationException)
  | 'CONCURRENT_MODIFICATION'
  | 'INSUFFICIENT_FUNDS'
  | 'ACCOUNT_OPERATION_FAILED'
  | 'MALFORMED_REQUEST'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'INTERNAL_SERVER_ERROR';
