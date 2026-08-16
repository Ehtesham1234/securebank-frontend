/**
 * Every path here is relative to environment.apiBaseUrl (the api-gateway,
 * .../api/v1). Nothing in this app calls a downstream service directly —
 * see api-gateway's application.properties for the routes these map to.
 */
export const API = {
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
    sendEmailOtp: '/auth/email/send-otp',
    verifyEmail: '/auth/email/verify',
  },
  kyc: {
    submit: '/kyc/submit',
    myStatus: '/kyc/status',
    document: (id: number) => `/kyc/${id}/document`,
  },
  teller: {
    pendingKyc: '/teller/kyc/pending',
    verifyKyc: (id: number) => `/teller/kyc/${id}/verify`,
    rejectKyc: (id: number) => `/teller/kyc/${id}/reject`,
  },
  accounts: {
    apply: '/accounts/apply',
    mine: '/accounts',
    byId: (id: number) => `/accounts/${id}`,
  },
  transactions: {
    deposit: (accountId: number) => `/transactions/accounts/${accountId}/deposit`,
    withdraw: (accountId: number) => `/transactions/accounts/${accountId}/withdraw`,
    transfer: '/transactions/transfer',
    history: (accountId: number) => `/transactions/accounts/${accountId}`,
  },
  cards: {
    mine: '/cards',
    block: (cardId: number) => `/cards/${cardId}/block`,
    unblock: (cardId: number) => `/cards/${cardId}/unblock`,
    cvv: (cardId: number) => `/cards/${cardId}/cvv`,
    payBill: (cardId: number) => `/cards/${cardId}/pay-bill`,
  },
  loans: {
    apply: '/loans/apply',
    mine: '/loans/my',
    byId: (id: number) => `/loans/${id}`,
    payEmi: (id: number) => `/loans/${id}/pay-emi`,
    approve: (id: number) => `/loans/${id}/approve`,
    reject: (id: number) => `/loans/${id}/reject`,
    // ADMIN only — there's no TELLER-scoped listing endpoint for loans the
    // way /teller/kyc/pending exists for KYC, even though TELLER can
    // approve/reject by id. See admin-loans.service.ts.
    byStatus: (status: string) => `/admin/loans/status/${status}`,
  },
} as const;
