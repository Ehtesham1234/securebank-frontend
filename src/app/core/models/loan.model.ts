/**
 * Mirrors com.ehtesham.loan_service.enums.LoanType.
 */
export type LoanType = 'PERSONAL_LOAN' | 'HOME_LOAN' | 'CAR_LOAN';

/**
 * Mirrors com.ehtesham.loan_service.enums.LoanStatus.
 */
export type LoanStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'CLOSED' | 'DEFAULTED' | 'FAILED';

/** Mirrors LoanApplicationRequest — POST /loans/apply body. accountId is
 *  which of the applicant's own accounts the loan disburses into on
 *  approval — must be an ACTIVE, non-FIXED_DEPOSIT account. */
export interface LoanApplicationRequest {
  loanType: LoanType;
  amount: number;
  tenureMonths: number;
  purpose: string;
  accountId: number;
}

/** Mirrors LoanReviewRequest — POST /loans/{id}/approve and
 *  POST /loans/{id}/reject body (TELLER/ADMIN only). */
export interface LoanReviewRequest {
  reason: string;
}

/** Mirrors LoanResponse. */
export interface LoanResponse {
  id: number;
  userId: number;
  loanRef: string;
  loanType: LoanType;
  status: LoanStatus;
  principalAmount: number;
  interestRate: number;
  tenureMonths: number;
  emiAmount: number;
  totalPayableAmount: number;
  outstandingAmount: number;
  emisPaid: number;
  emisRemaining: number;
  nextEmiDate: string | null;
  disbursementDate: string | null;
  rejectionReason: string | null;
  purpose: string;
  accountNumber: string;
  createdAt: string;
}