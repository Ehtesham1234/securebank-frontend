import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    // Authenticated shell (topbar + sidebar) wraps every logged-in route.
    // Add new feature routes as children here in later phases.
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell/shell.component').then((m) => m.ShellComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
        title: 'Dashboard · SecureBank',
      },
      {
        path: 'security',
        loadComponent: () =>
          import('./features/account-security/account-security.component').then(
            (m) => m.AccountSecurityComponent,
          ),
        title: 'Account security · SecureBank',
      },
      {
        path: 'kyc',
        canActivate: [roleGuard('CUSTOMER')],
        loadComponent: () => import('./features/kyc/kyc.component').then((m) => m.KycComponent),
        title: 'Verify your identity · SecureBank',
      },
      {
        path: 'teller/kyc',
        canActivate: [roleGuard('TELLER', 'ADMIN')],
        loadComponent: () =>
          import('./features/teller-kyc/teller-kyc-list/teller-kyc-list.component').then(
            (m) => m.TellerKycListComponent,
          ),
        title: 'KYC review · SecureBank',
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
