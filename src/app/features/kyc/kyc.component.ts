import { ChangeDetectionStrategy, Component, OnInit, effect, inject, signal } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { KycStatusComponent } from './kyc-status/kyc-status.component';
import { KycSubmitComponent } from './kyc-submit/kyc-submit.component';
import { KycService } from './kyc.service';

@Component({
  selector: 'sb-kyc',
  standalone: true,
  imports: [KycSubmitComponent, KycStatusComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './kyc.component.html',
})
export class KycComponent implements OnInit {
  private readonly authService = inject(AuthService);

  /** Public so the template can read status()/checked() directly — this
   *  component is a thin container, not an owner of KYC state. */
  readonly service = inject(KycService);

  /** True while a REJECTED user has asked to try again — overrides the
   *  status view back to the submit form. Reset implicitly: once a new
   *  submission succeeds, kyc().status is no longer REJECTED, so this flag
   *  stops mattering regardless of its value. */
  readonly resubmitting = signal(false);

  private hasRefreshedTokenForVerified = false;

  constructor() {
    // Once verification flips PENDING_KYC -> ACTIVE server-side, the
    // access token this tab is holding is stale until refreshed — see
    // KycServiceImpl.verifyKyc's comment on securebank-api. Pull a fresh
    // one as soon as we see VERIFIED so the rest of the app (nav, guards)
    // picks up the new status without the user having to log out/in.
    effect(() => {
      const status = this.service.status();
      if (status?.status === 'VERIFIED' && !this.hasRefreshedTokenForVerified) {
        this.hasRefreshedTokenForVerified = true;
        this.authService.refreshAccessToken().subscribe();
      }
    });
  }

  ngOnInit(): void {
    this.service.refresh();
  }

  startResubmit(): void {
    this.resubmitting.set(true);
  }

  cancelResubmit(): void {
    this.resubmitting.set(false);
  }
}
