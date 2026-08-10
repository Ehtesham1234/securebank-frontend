import { HttpContext, HttpContextToken, HttpInterceptorFn } from '@angular/common/http';

export const REQUIRES_IDEMPOTENCY_KEY = new HttpContextToken<boolean>(() => false);

/**
 * Opt a request into an auto-generated `Idempotency-Key` header. The gateway
 * explicitly allow-lists this header (see ApiGatewayApplication's CORS
 * config) and account-service's deposit/withdraw/transfer endpoints require
 * it — use this once those calls land in a later phase:
 *
 *   this.http.post(url, body, { context: withIdempotencyKey() })
 *
 * Deliberately not wired to any specific URL here — that would couple core
 * HTTP plumbing to feature routes that don't exist yet in this phase. Any
 * future service opts in explicitly instead.
 */
export function withIdempotencyKey(context = new HttpContext()): HttpContext {
  return context.set(REQUIRES_IDEMPOTENCY_KEY, true);
}

export const idempotencyInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.context.get(REQUIRES_IDEMPOTENCY_KEY) || req.headers.has('Idempotency-Key')) {
    return next(req);
  }
  return next(req.clone({ setHeaders: { 'Idempotency-Key': crypto.randomUUID() } }));
};
