import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { interval, map, take } from 'rxjs';
import { ErrorResponse } from '../../../core/models/api-response.model';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

const RESEND_COOLDOWN_SECONDS = 30;

@Component({
  selector: 'sb-verify-email',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ButtonModule, InputTextModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './verify-email.component.html',
})
export class VerifyEmailComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly notify = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly submitting = signal(false);
  readonly resending = signal(false);
  readonly otpError = signal<string | null>(null);
  readonly resendCooldown = signal(0);

  readonly form = this.fb.nonNullable.group({
    email: [this.route.snapshot.queryParamMap.get('email') ?? '', [Validators.required, Validators.email]],
    otp: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.otpError.set(null);
    this.submitting.set(true);
    const { email, otp } = this.form.getRawValue();

    this.auth.verifyEmail({ email, otp }).subscribe({
      next: () => {
        this.notify.success('Email verified — you can log in now.');
        void this.router.navigate(['/auth/login']);
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        if (err instanceof HttpErrorResponse && err.status === 400) {
          const body = err.error as ErrorResponse | undefined;
          if (body?.error === 'INVALID_OTP') {
            this.otpError.set(body.message);
          }
        }
      },
    });
  }

  resend(): void {
    const email = this.form.controls.email.value;
    if (this.form.controls.email.invalid) {
      this.form.controls.email.markAsTouched();
      return;
    }

    this.resending.set(true);
    this.auth.sendEmailOtp({ email }).subscribe({
      next: () => {
        this.resending.set(false);
        this.notify.info('A new code is on its way if that email is registered.');
        this.startCooldown();
      },
      error: () => this.resending.set(false),
    });
  }

  private startCooldown(): void {
    this.resendCooldown.set(RESEND_COOLDOWN_SECONDS);
    interval(1000)
      .pipe(
        take(RESEND_COOLDOWN_SECONDS),
        map((tick) => RESEND_COOLDOWN_SECONDS - tick - 1),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((remaining) => this.resendCooldown.set(remaining));
  }
}
