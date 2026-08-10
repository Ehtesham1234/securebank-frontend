import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { KYC_DOCUMENT_TYPE_OPTIONS, KycResponse } from '../../../core/models/kyc.model';
import { KycDocumentPreviewComponent } from '../kyc-document-preview/kyc-document-preview.component';

@Component({
  selector: 'sb-kyc-status',
  standalone: true,
  imports: [RouterLink, ButtonModule, TagModule, KycDocumentPreviewComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './kyc-status.component.html',
})
export class KycStatusComponent {
  readonly kyc = input.required<KycResponse>();
  readonly resubmit = output<void>();

  documentTypeLabel(): string {
    return (
      KYC_DOCUMENT_TYPE_OPTIONS.find((o) => o.value === this.kyc().documentType)?.label ??
      this.kyc().documentType
    );
  }
}
