import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { API } from '../../core/constants/api-endpoints';
import { ApiResponse } from '../../core/models/api-response.model';
import { KycResponse, KycSubmitRequest } from '../../core/models/kyc.model';
import { withSilentErrors } from '../../core/interceptors/error.interceptor';

const BASE = environment.apiBaseUrl;

@Injectable({ providedIn: 'root' })
export class KycService {
  private readonly http = inject(HttpClient);

  /** null = no submission on file (or not checked yet — see `checked`). */
  private readonly statusSignal = signal<KycResponse | null>(null);
  readonly status = this.statusSignal.asReadonly();

  private readonly loadingSignal = signal(true);
  readonly loading = this.loadingSignal.asReadonly();

  /** False until the first refresh() call resolves — lets the component
   *  distinguish "still loading the initial check" from "checked, and
   *  confirmed there's genuinely nothing submitted yet". */
  private readonly checkedSignal = signal(false);
  readonly checked = this.checkedSignal.asReadonly();

  /** Fetches the current user's KYC status and updates `status`/`loading`/
   *  `checked`. Fire-and-forget — the component reads the signals rather
   *  than subscribing itself (same pattern as AccountSecurityService). A
   *  404 means "nothing submitted yet", not an error: it's mapped to a
   *  null status with no toast (see withSilentErrors) rather than
   *  propagated. Any other failure also clears loading/sets checked so the
   *  component isn't stuck on a spinner forever, but leaves `status`
   *  untouched — the component's own error UI decides what to show. */
  refresh(): void {
    this.loadingSignal.set(true);
    this.http
      .get<ApiResponse<KycResponse>>(`${BASE}${API.kyc.myStatus}`, {
        context: withSilentErrors(),
      })
      .pipe(
        map((res) => res.data),
        catchError((err: unknown) => {
          if (err instanceof HttpErrorResponse && err.status === 404) {
            return of(null);
          }
          return throwError(() => err);
        }),
      )
      .subscribe({
        next: (data) => {
          this.statusSignal.set(data);
          this.loadingSignal.set(false);
          this.checkedSignal.set(true);
        },
        error: () => {
          this.loadingSignal.set(false);
          this.checkedSignal.set(true);
        },
      });
  }

  /** Submits the KYC form as multipart/form-data: a `data` part (the JSON
   *  body, as a Blob so it gets the right part Content-Type) plus a `file`
   *  part. Do NOT set a Content-Type header on this request yourself — the
   *  browser needs to set the multipart boundary itself from the FormData
   *  object, and a manual header would break that. */
  submit(request: KycSubmitRequest, file: File): Observable<KycResponse> {
    const formData = new FormData();
    formData.append('data', new Blob([JSON.stringify(request)], { type: 'application/json' }));
    formData.append('file', file);

    return this.http.post<ApiResponse<KycResponse>>(`${BASE}${API.kyc.submit}`, formData).pipe(
      map((res) => res.data),
      tap((data) => this.statusSignal.set(data)),
    );
  }

  /** Fetches the raw uploaded document (image or PDF) behind a KYC
   *  submission — GET /kyc/{id}/document, new in the v14 backend. The
   *  backend enforces "self or staff" ownership itself (404s otherwise),
   *  so this is safe to call with any id the caller can see in a response. */
  getDocumentBlob(kycId: number): Observable<Blob> {
    return this.http.get(`${BASE}${API.kyc.document(kycId)}`, { responseType: 'blob' });
  }
}
