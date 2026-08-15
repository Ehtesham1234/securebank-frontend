/**
 * Mirrors com.ehtesham.account_service.card.enums.CardType.
 */
export type CardType = 'DEBIT_CARD' | 'CREDIT_CARD';

/**
 * Mirrors com.ehtesham.account_service.card.enums.CardStatus.
 */
export type CardStatus = 'ACTIVE' | 'BLOCKED' | 'CANCELLED' | 'EXPIRED';

/**
 * Mirrors CardResponse. dailyLimit is only meaningful for DEBIT_CARD;
 * creditLimit/availableCredit/outstandingBill/dueDate only for
 * CREDIT_CARD — the backend just leaves the other set null rather than
 * using separate DTOs, so treat all four as "maybe null" regardless of
 * cardType.
 */
export interface CardResponse {
  id: number;
  maskedNumber: string;
  cardType: CardType;
  status: CardStatus;
  expiryDate: string;
  cardHolderName: string;
  dailyLimit: number | null;
  creditLimit: number | null;
  availableCredit: number | null;
  outstandingBill: number | null;
  dueDate: string | null;
  accountNumber: string;
  createdAt: string;
}

/** Mirrors CvvResponse — GET /cards/{id}/cvv. Derived on demand server-side,
 *  never stored — don't cache this beyond the current reveal toggle. */
export interface CvvResponse {
  cvv: string;
}