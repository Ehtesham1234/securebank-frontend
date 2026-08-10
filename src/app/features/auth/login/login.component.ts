import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { AuthService } from '../../../core/services/auth.service';
import { ErrorResponse } from '../../../core/models/api-response.model';

@Component({
  selector: 'sb-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ButtonModule, InputTextModule, PasswordModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.submitting.set(true);
    const { email, password } = this.form.getRawValue();

    this.auth.login({ email, password }).subscribe({
      next: (authResponse) => {
        const explicitReturnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        // No explicit destination, and this customer still needs to
        // complete KYC — send them straight there instead of a dashboard
        // they can't do much on yet. A returnUrl always wins, though: if
        // they were bounced here from a specific page, honor that.
        const needsKyc = authResponse.role === 'CUSTOMER' && authResponse.userStatus === 'PENDING_KYC';
        const destination = explicitReturnUrl ?? (needsKyc ? '/kyc' : '/dashboard');
        void this.router.navigateByUrl(destination);
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        if (err instanceof HttpErrorResponse) {
          const body = err.error as ErrorResponse | undefined;
          if (err.status === 401) {
            this.errorMessage.set(body?.message ?? 'Invalid email or password.');
            return;
          }
          if (body?.error === 'EMAIL_NOT_VERIFIED') {
            void this.router.navigate(['/auth/verify-email'], { queryParams: { email } });
          }
          // ACCOUNT_LOCKED / ACCOUNT_SUSPENDED / ACCOUNT_CLOSED / RATE_LIMIT_EXCEEDED
          // already surface as a toast via the error interceptor — nothing
          // further to do here for those.
        }
      },
    });
  }
}
