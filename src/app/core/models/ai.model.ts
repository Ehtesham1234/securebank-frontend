/**
 * Mirrors ChatRequest. conversationId is deliberately omitted from every
 * call this app makes — the backend defaults it to the caller's userId,
 * giving each user exactly one persistent thread, which is the comment's
 * own stated intent ("a banking assistant doesn't need multiple threads").
 */
export interface ChatRequestBody {
  question: string;
}

/** Mirrors ChatResponse — the non-streaming /ai/chat shape. Not used by
 *  this app (which always streams), but kept for completeness/reference. */
export interface ChatResponse {
  answer: string;
  conversationId: string;
  userId: number;
}

export type FinancialHealthStatus = 'HEALTHY' | 'CAUTION' | 'AT_RISK';

/** Mirrors FinancialSummary — GET /ai/summary. */
export interface FinancialSummary {
  totalBalance: number;
  totalOutstandingLoans: number;
  nextEmiAmount: number;
  totalSpentThisMonth: number;
  totalReceivedThisMonth: number;
  financialHealthStatus: FinancialHealthStatus;
  recommendations: string[];
}

/** Local-only — the backend has no "get conversation history" endpoint,
 *  so this only ever reflects the current browser session. Reloading the
 *  page clears the visible transcript, even though the AI's own memory of
 *  the conversation likely persists server-side (same conversationId). */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}