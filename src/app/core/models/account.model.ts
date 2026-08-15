/**
 * Mirrors com.ehtesham.account_service.account.enums.AccountType.
 */
export type AccountType = 'SAVINGS' | 'CURRENT' | 'FIXED_DEPOSIT';

/**
 * Mirrors com.ehtesham.account_service.account.enums.AccountStatus.
 */
export type AccountStatus = 'ACTIVE' | 'FROZEN' | 'CLOSED' | 'DORMANT';

/** Mirrors AccountApplicationRequest — POST /accounts/apply body.
 *  initialDeposit/durationMonths are only required when accountType is
 *  FIXED_DEPOSIT (backend validates minimum 1000, 1-120 months); leave
 *  them undefined for SAVINGS/CURRENT applications. */
export interface AccountApplicationRequest {
  accountType: AccountType;
  initialDeposit?: number;
  durationMonths?: number;
}

/** Mirrors FixedDepositResponse — only present on AccountResponse when
 *  accountType is FIXED_DEPOSIT. */
export interface FixedDepositResponse {
  principalAmount: number;
  interestRate: number;
  durationMonths: number;
  maturityDate: string;
  maturityAmount: number;
}

/** Mirrors AccountResponse. */
export interface AccountResponse {
  id: number;
  accountNumber: string;
  userId: number;
  accountType: AccountType;
  accountStatus: AccountStatus;
  balance: number;
  fixedDepositDetails: FixedDepositResponse | null;
  createdAt: string;
}

/**
 * Mirrors com.ehtesham.account_service.transaction.enums.TransactionType.
 */
export type TransactionType = 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER_IN' | 'TRANSFER_OUT';

/**
 * Mirrors com.ehtesham.account_service.transaction.enums.TransactionStatus.
 */
export type TransactionStatus = 'SUCCESS' | 'FAILED' | 'REVERSED';

/** Mirrors DepositRequest — POST /transactions/accounts/{id}/deposit body.
 *  Requires an Idempotency-Key header — see withIdempotencyKey() in
 *  core/interceptors/idempotency.interceptor.ts. */
export interface DepositRequest {
  amount: number;
  description?: string;
}

/** Mirrors TransactionResponse. */
export interface TransactionResponse {
  id: number;
  transactionRef: string;
  accountNumber: string;
  type: TransactionType;
  amount: number;
  balanceAfter: number;
  status: TransactionStatus;
  description: string | null;
  relatedAccountNumber: string | null;
  createdAt: string;
}

/** Mirrors WithdrawRequest — POST /transactions/accounts/{id}/withdraw
 *  body. Also needs an Idempotency-Key header, same as deposit. */
export interface WithdrawRequest {
  amount: number;
  description?: string;
}

/** Mirrors TransferRequest — POST /transactions/transfer body. Both
 *  account fields are account NUMBERS, not internal ids — toAccountNumber
 *  can belong to any customer, not just accounts you own. */
export interface TransferRequest {
  fromAccountNumber: string;
  toAccountNumber: string;
  amount: number;
  description?: string;
}