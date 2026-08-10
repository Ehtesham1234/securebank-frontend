import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
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
  selector: 'sb-register',
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
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);

  readonly submitting = signal(false);
  private readonly backendFieldErrors = signal<Record<string, string>>({});

  readonly form = this.fb.nonNullable.group(
    {
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, strongPasswordValidator()]],
      confirmPassword: ['', Validators.required],
    },
    { validators: matchFieldsValidator('password', 'confirmPassword') },
  );

  fieldError(name: string): string | null {
    return this.backendFieldErrors()[name] ?? null;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.backendFieldErrors.set({});
    this.submitting.set(true);
    const { firstName, lastName, email, password } = this.form.getRawValue();

    this.auth.register({ firstName, lastName, email, password }).subscribe({
      next: () => {
        // Deliberately neutral: the backend returns this same shape whether
        // the email was new or already registered, to avoid confirming
        // which — the UI must not editorialize past what it's told either.
        this.notify.info(
          "If this email isn't already registered, we've sent a verification code to it.",
          'Check your email',
        );
        void this.router.navigate(['/auth/verify-email'], { queryParams: { email } });
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
