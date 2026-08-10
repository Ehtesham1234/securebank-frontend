import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SharedModule } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { KYC_DOCUMENT_TYPE_OPTIONS, KycResponse } from '../../../core/models/kyc.model';
import { NotificationService } from '../../../core/services/notification.service';
import { KycDocumentPreviewComponent } from '../../kyc/kyc-document-preview/kyc-document-preview.component';
import { TellerKycService } from '../teller-kyc.service';

@Component({
  selector: 'sb-teller-kyc-list',
  standalone: true,
  imports: [DatePipe, TableModule, SharedModule, ButtonModule, DialogModule, KycDocumentPreviewComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './teller-kyc-list.component.html',
})
export class TellerKycListComponent implements OnInit {
  readonly service = inject(TellerKycService);
  private readonly notify = inject(NotificationService);

  readonly selected = signal<KycResponse | null>(null);
  readonly rejecting = signal(false);
  readonly rejectReason = signal('');
  readonly actionInFlight = signal(false);

  ngOnInit(): void {
    this.service.refresh();
  }

  documentTypeLabel(kyc: KycResponse): string {
    return (
      KYC_DOCUMENT_TYPE_OPTIONS.find((o) => o.value === kyc.documentType)?.label ??
      kyc.documentType
    );
  }

  open(kyc: KycResponse): void {
    this.selected.set(kyc);
    this.rejecting.set(false);
    this.rejectReason.set('');
  }

  close(): void {
    this.selected.set(null);
  }

  startReject(): void {
    this.rejecting.set(true);
  }

  cancelReject(): void {
    this.rejecting.set(false);
    this.rejectReason.set('');
  }

  onReasonInput(event: Event): void {
    this.rejectReason.set((event.target as HTMLTextAreaElement).value);
  }

  verify(): void {
    const kyc = this.selected();
    if (!kyc) return;

    this.actionInFlight.set(true);
    this.service.verify(kyc.id).subscribe({
      next: () => {
        this.actionInFlight.set(false);
        this.notify.success(
          `KYC #${kyc.id} verified — the customer's savings account has been created.`,
        );
        this.close();
      },
      error: () => this.actionInFlight.set(false),
    });
  }

  confirmReject(): void {
    const kyc = this.selected();
    const reason = this.rejectReason().trim();
    if (!kyc || !reason) return;

    this.actionInFlight.set(true);
    this.service.reject(kyc.id, reason).subscribe({
      next: () => {
        this.actionInFlight.set(false);
        this.notify.info(`KYC #${kyc.id} rejected.`);
        this.close();
      },
      error: () => this.actionInFlight.set(false),
    });
  }
}
