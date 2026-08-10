/**
 * Production build values. Update these to your deployed gateway's public URL
 * before shipping — as written this still points at localhost, which is only
 * correct if the frontend and gateway are served from the same host.
 */
export const environment = {
  production: true,
  apiBaseUrl: 'https://api.yourdomain.com/api/v1',
  wsUrl: 'https://api.yourdomain.com/ws',
};
