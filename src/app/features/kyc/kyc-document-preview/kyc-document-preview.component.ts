import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { KycService } from '../kyc.service';

@Component({
  selector: 'sb-kyc-document-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './kyc-document-preview.component.html',
})
export class KycDocumentPreviewComponent {
  private readonly kycService = inject(KycService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);

  readonly kycId = input.required<number>();

  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly isPdf = signal(false);
  /** Angular sanitizes `src` on <embed>/<iframe> as a "resource URL" and
   *  will silently strip a plain string — a blob: URL has to be explicitly
   *  marked trusted via DomSanitizer to actually render. (<img src> alone
   *  wouldn't need this, but we use one signal for both element types.) */
  readonly safeUrl = signal<SafeResourceUrl | null>(null);

  /** The raw (unsanitized) blob: URL, kept only so revoke() can pass it to
   *  URL.revokeObjectURL — that API doesn't accept a SafeResourceUrl. */
  private rawUrl: string | null = null;

  constructor() {
    // Re-fetches whenever kycId changes (e.g. a teller paging between
    // pending submissions reusing the same preview component instance).
    effect(() => {
      const id = this.kycId();
      this.load(id);
    });

    this.destroyRef.onDestroy(() => this.revoke());
  }

  private load(id: number): void {
    this.revoke();
    this.loading.set(true);
    this.loadError.set(false);

    this.kycService.getDocumentBlob(id).subscribe({
      next: (blob) => {
        this.isPdf.set(blob.type === 'application/pdf');
        this.rawUrl = URL.createObjectURL(blob);
        this.safeUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.rawUrl));
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set(true);
        this.loading.set(false);
      },
    });
  }

  /** Object URLs are only valid for the life of the document they point
   *  at — always revoke the previous one before creating a new one, and on
   *  destroy, or the browser leaks memory for every document viewed. */
  private revoke(): void {
    if (this.rawUrl) {
      URL.revokeObjectURL(this.rawUrl);
      this.rawUrl = null;
    }
    this.safeUrl.set(null);
  }
}
