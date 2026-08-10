/**
 * Development defaults. Replaced by environment.prod.ts in production builds
 * (see fileReplacements in angular.json).
 *
 * apiBaseUrl / wsUrl point at the api-gateway — every backend call in this app
 * goes through the gateway (port 8090). No feature module should ever talk to
 * account-service, kyc-service, etc. directly.
 *
 * If you're running `ng serve --proxy-config proxy.conf.json`, you can instead
 * set apiBaseUrl to '' (relative) and let the dev-server proxy handle it —
 * see proxy.conf.json and the README for both options.
 */
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8090/api/v1',
  wsUrl: 'http://localhost:8090/ws',
};
