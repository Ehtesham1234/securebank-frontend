import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { Role } from '../../../core/models/enums';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles: Role[];
  /** Only shown while userStatus is PENDING_KYC — currently just
   *  "Complete KYC": once verified there's nothing left to do there, so
   *  it should disappear rather than sit in the nav pointing at a screen
   *  that just shows "you're verified" forever. */
  onlyWhilePendingKyc?: boolean;
}

/**
 * Extend this list as later phases add features, e.g.:
 *   { label: 'Admin', icon: 'pi pi-shield', route: '/admin', roles: ['ADMIN'] }
 */
const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    icon: 'pi pi-home',
    route: '/dashboard',
    roles: ['CUSTOMER', 'TELLER', 'ADMIN'],
  },
  {
    label: 'Complete KYC',
    icon: 'pi pi-id-card',
    route: '/kyc',
    roles: ['CUSTOMER'],
    onlyWhilePendingKyc: true,
  },
  {
    label: 'Accounts',
    icon: 'pi pi-wallet',
    route: '/accounts',
    roles: ['CUSTOMER'],
  },
  {
    label: 'Cards',
    icon: 'pi pi-credit-card',
    route: '/cards',
    roles: ['CUSTOMER'],
  },
  {
    label: 'Loans',
    icon: 'pi pi-money-bill',
    route: '/loans',
    roles: ['CUSTOMER'],
  },
  {
    label: 'KYC Review',
    icon: 'pi pi-verified',
    route: '/teller/kyc',
    roles: ['TELLER', 'ADMIN'],
  },
  {
    // ADMIN only -- see admin-loans.service.ts for why.
    label: 'Loan Review',
    icon: 'pi pi-money-bill',
    route: '/admin/loans',
    roles: ['ADMIN'],
  },
  {
    label: 'Security',
    icon: 'pi pi-shield',
    route: '/security',
    roles: ['CUSTOMER', 'TELLER', 'ADMIN'],
  },
];

@Component({
  selector: 'sb-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sidebar.component.html',
})
export class SidebarComponent {
  private readonly auth = inject(AuthService);

  readonly items = computed(() => {
    const user = this.auth.currentUser();
    const role = user?.role;
    return NAV_ITEMS.filter((item) => {
      const roleMatches = !role || item.roles.includes(role);
      if (!roleMatches) {
        return false;
      }
      if (item.onlyWhilePendingKyc && user?.userStatus !== 'PENDING_KYC') {
        return false;
      }
      return true;
    });
  });
}