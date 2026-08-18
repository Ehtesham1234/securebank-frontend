import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { activeStatusGuard } from './core/guards/active-status.guard';

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
        path: 'accounts',
        canActivate: [roleGuard('CUSTOMER'), activeStatusGuard],
        loadComponent: () =>
          import('./features/accounts/accounts-list/accounts-list.component').then(
            (m) => m.AccountsListComponent,
          ),
        title: 'Accounts · SecureBank',
      },
      {
        path: 'cards',
        canActivate: [roleGuard('CUSTOMER'), activeStatusGuard],
        loadComponent: () =>
          import('./features/cards/cards-list/cards-list.component').then(
            (m) => m.CardsListComponent,
          ),
        title: 'Cards · SecureBank',
      },
      {
        path: 'loans',
        canActivate: [roleGuard('CUSTOMER'), activeStatusGuard],
        loadComponent: () =>
          import('./features/loans/loans-list/loans-list.component').then(
            (m) => m.LoansListComponent,
          ),
        title: 'Loans · SecureBank',
      },
      {
        // ADMIN only -- see admin-loans.service.ts for why TELLER can't
        // use this despite being allowed to approve/reject by id.
        path: 'admin/loans',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./features/admin-loans/admin-loans-list/admin-loans-list.component').then(
            (m) => m.AdminLoansListComponent,
          ),
        title: 'Loan review · SecureBank',
      },
      {
        path: 'admin/accounts',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./features/admin-accounts/admin-accounts-list/admin-accounts-list.component').then(
            (m) => m.AdminAccountsListComponent,
          ),
        title: 'All accounts · SecureBank',
      },
      {
        path: 'admin/transactions',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import(
            './features/admin-transactions/admin-transactions-list/admin-transactions-list.component'
          ).then((m) => m.AdminTransactionsListComponent),
        title: 'All transactions · SecureBank',
      },
            {
        path: 'assistant',
        canActivate: [roleGuard('CUSTOMER'), activeStatusGuard],
        loadComponent: () =>
          import('./features/ai-assistant/ai-assistant.component').then(
            (m) => m.AiAssistantComponent,
          ),
        title: 'Assistant · SecureBank',
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
