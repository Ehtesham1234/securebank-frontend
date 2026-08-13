import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { AuthService } from '../../../core/services/auth.service';
import { ErrorResponse } from '../../../core/models/api-response.model';
import { Role, UserStatus } from '../../../core/models/enums';

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
        const destination =
          explicitReturnUrl ?? this.defaultDestinationFor(authResponse.role, authResponse.userStatus);
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

  /** Where a role lands with no explicit returnUrl — i.e. their most useful
   *  starting point right now, not just "the dashboard" by default. */
  private defaultDestinationFor(role: Role, userStatus: UserStatus): string {
    if (role === 'CUSTOMER' && userStatus === 'PENDING_KYC') {
      return '/kyc';
    }
    if (role === 'TELLER') {
      // The only task a teller has right now. Revisit if/when tellers get
      // more than one thing to do and a real staff dashboard makes sense.
      return '/teller/kyc';
    }
    // ADMIN: nothing role-specific built yet, so this falls through to the
    // generic dashboard like a customer would. Update once an admin
    // console exists.
    return '/dashboard';
  }
}