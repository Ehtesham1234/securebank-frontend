import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ErrorResponse } from '../../../core/models/api-response.model';
import {
  KYC_ALLOWED_EXTENSIONS,
  KYC_DOCUMENT_TYPE_OPTIONS,
  KYC_MAX_FILE_SIZE_BYTES,
  KycDocumentType,
} from '../../../core/models/kyc.model';
import { NotificationService } from '../../../core/services/notification.service';
import { KycService } from '../kyc.service';

@Component({
  selector: 'sb-kyc-submit',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, SelectModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './kyc-submit.component.html',
})
export class KycSubmitComponent {
  private readonly fb = inject(FormBuilder);
  private readonly kycService = inject(KycService);
  private readonly notify = inject(NotificationService);

  readonly documentTypeOptions = KYC_DOCUMENT_TYPE_OPTIONS;
  readonly allowedExtensions = KYC_ALLOWED_EXTENSIONS;

  readonly submitting = signal(false);
  readonly selectedFile = signal<File | null>(null);
  readonly fileError = signal<string | null>(null);
  readonly dragActive = signal(false);
  private readonly backendFieldErrors = signal<Record<string, string>>({});

  readonly form = this.fb.nonNullable.group({
    documentType: ['AADHAAR' as KycDocumentType, Validators.required],
    documentNumber: ['', Validators.required],
  });

  fieldError(name: string): string | null {
    return this.backendFieldErrors()[name] ?? null;
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragActive.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragActive.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragActive.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.setFile(file);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.setFile(file);
    }
    input.value = ''; // allow re-selecting the same file after removing it
  }

  removeFile(): void {
    this.selectedFile.set(null);
    this.fileError.set(null);
  }

  private setFile(file: File): void {
    const ext = '.' + (file.name.split('.').pop() ?? '').toLowerCase();
    if (!this.allowedExtensions.includes(ext)) {
      this.fileError.set(`File type not supported. Use ${this.allowedExtensions.join(', ')}.`);
      this.selectedFile.set(null);
      return;
    }
    if (file.size > KYC_MAX_FILE_SIZE_BYTES) {
      this.fileError.set('File is too large — the maximum is 10MB.');
      this.selectedFile.set(null);
      return;
    }
    this.fileError.set(null);
    this.selectedFile.set(file);
  }

  submit(): void {
    if (this.form.invalid || !this.selectedFile()) {
      this.form.markAllAsTouched();
      if (!this.selectedFile()) {
        this.fileError.set('Please attach a document.');
      }
      return;
    }

    this.backendFieldErrors.set({});
    this.submitting.set(true);
    const { documentType, documentNumber } = this.form.getRawValue();

    this.kycService.submit({ documentType, documentNumber }, this.selectedFile()!).subscribe({
      next: () => {
        // KycService.submit() already updates the shared status signal —
        // the parent KycComponent reacts to that and swaps this form out
        // for the status view on its own, so there's nothing to navigate
        // to here.
        this.notify.success("We've received your documents — review usually takes a day or two.");
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        if (err instanceof HttpErrorResponse && err.status === 400) {
          const body = err.error as ErrorResponse | undefined;
          if (body?.validationErrors) {
            this.backendFieldErrors.set(body.validationErrors);
          }
        }
      },
    });
  }
}
