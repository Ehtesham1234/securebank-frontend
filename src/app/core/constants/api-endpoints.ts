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
} as const;
