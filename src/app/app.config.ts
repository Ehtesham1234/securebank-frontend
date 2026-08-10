import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { APP_INITIALIZER, ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { firstValueFrom } from 'rxjs';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { idempotencyInterceptor } from './core/interceptors/idempotency.interceptor';
import { AuthService } from './core/services/auth.service';
import { SecureBankPreset } from './core/theme/securebank-preset';

function initializeAuth(auth: AuthService) {
  // Attempts a silent refresh from the persisted refresh token before the
  // router activates any guarded route — see AuthService.initFromStorage
  // and authGuard for how they coordinate on auth.ready().
  return () => firstValueFrom(auth.initFromStorage());
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    // Order matters — see the interceptors themselves for why: errorInterceptor
    // is outermost (only reports errors auth/idempotency didn't already
    // resolve), authInterceptor is innermost (closest to the actual request).
    provideHttpClient(
      withInterceptors([errorInterceptor, idempotencyInterceptor, authInterceptor]),
    ),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: SecureBankPreset,
        options: {
          darkModeSelector: '.dark',
          cssLayer: {
            name: 'primeng',
            order: 'tailwind-base, primeng, tailwind-utilities',
          },
        },
      },
      ripple: true,
    }),
    MessageService,
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAuth,
      deps: [AuthService],
      multi: true,
    },
  ],
};
