import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { API } from '../../core/constants/api-endpoints';
import { ChatRequestBody, FinancialSummary } from '../../core/models/ai.model';
import { TokenStorageService } from '../../core/services/token-storage.service';

const BASE = environment.apiBaseUrl;

@Injectable({ providedIn: 'root' })
export class AiChatService {
  private readonly http = inject(HttpClient);
  private readonly tokens = inject(TokenStorageService);

  /** GET /ai/summary — NOT wrapped in ApiResponse<T> (see api-endpoints.ts
   *  note), so this reads the response directly with no .pipe(map(...))
   *  unwrap, unlike every other service in this app. Likely invokes the AI
   *  model itself (the backend's own comment calls out "structured output"
   *  via the model, not a plain DB query), so this is called on demand
   *  from a button rather than automatically on page load. */
  getSummary(): Observable<FinancialSummary> {
    return this.http.get<FinancialSummary>(`${BASE}${API.ai.summary}`);
  }

  /**
   * POST /ai/chat/stream — Server-Sent Events. Deliberately uses the
   * native fetch() API rather than HttpClient, matching the backend
   * controller's own doc comment: reading a streaming Response body
   * incrementally isn't something HttpClient/interceptors support
   * cleanly. Wrapped in an Observable so calling code can .subscribe()
   * like every other service call in this app — next() fires once per
   * token chunk as it streams in, complete() fires when the model
   * finishes.
   *
   * Trade-off worth knowing: because this bypasses HttpClient, it also
   * bypasses authInterceptor's silent-refresh-on-401. If the access token
   * happens to be expired the instant a message is sent, this call fails
   * outright instead of transparently refreshing and retrying like every
   * other request in the app. In practice this is a narrow edge case —
   * the token gets refreshed during normal navigation/other API calls —
   * but it's a real gap, not an oversight to silently ignore.
   */
  streamChat(question: string): Observable<string> {
    return new Observable<string>((subscriber) => {
      const controller = new AbortController();
      const token = this.tokens.getAccessToken();
      const body: ChatRequestBody = { question };

      fetch(`${BASE}${API.ai.chatStream}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok || !response.body) {
            subscriber.error(new Error(`AI chat request failed (${response.status})`));
            return;
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          // SSE frames are separated by a blank line; each line within a
          // frame that starts with "data:" carries one chunk of content.
          // A frame can span multiple reader.read() calls, so partial
          // data is held in `buffer` until a full "\n\n" boundary arrives.
          for (;;) {
            const { done, value } = await reader.read();
            if (done) {
              break;
            }
            buffer += decoder.decode(value, { stream: true });

            const frames = buffer.split('\n\n');
            buffer = frames.pop() ?? '';

            for (const frame of frames) {
              for (const line of frame.split('\n')) {
                if (line.startsWith('data:')) {
                  subscriber.next(line.slice(5).trimStart());
                }
              }
            }
          }

          subscriber.complete();
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === 'AbortError') {
            return; // expected — the teardown below aborts on unsubscribe
          }
          subscriber.error(err);
        });

      // Teardown: if the component unsubscribes early (navigates away
      // mid-stream), stop the fetch rather than let it run to completion
      // in the background for no one.
      return () => controller.abort();
    });
  }
}