import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ErrorResponse } from '../../../core/models/api-response.model';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { PasswordChecklistComponent } from '../../../shared/components/password-checklist/password-checklist.component';
import { matchFieldsValidator } from '../../../shared/validators/match-fields.validator';
import { strongPasswordValidator } from '../../../shared/validators/password-policy.validator';

@Component({
  selector: 'sb-reset-password',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    PasswordChecklistComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reset-password.component.html',
})
export class ResetPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly notify = inject(NotificationService);

  readonly submitting = signal(false);
  readonly otpError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group(
    {
      email: [this.route.snapshot.queryParamMap.get('email') ?? '', [Validators.required, Validators.email]],
      otp: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
      newPassword: ['', [Validators.required, strongPasswordValidator()]],
      confirmPassword: ['', Validators.required],
    },
    { validators: matchFieldsValidator('newPassword', 'confirmPassword') },
  );

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.otpError.set(null);
    this.submitting.set(true);
    const { email, otp, newPassword } = this.form.getRawValue();

    this.auth.resetPassword({ email, otp, newPassword }).subscribe({
      next: () => {
        this.notify.success('Your password has been reset. Log in with your new password.');
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
}
