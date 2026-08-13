import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { Role } from '../../../core/models/enums';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles: Role[];
}

/**
 * Extend this list as later phases add features, e.g.:
 *   { label: 'Accounts', icon: 'pi pi-wallet', route: '/accounts', roles: ['CUSTOMER'] }
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
  },
  {
    label: 'KYC Review',
    icon: 'pi pi-verified',
    route: '/teller/kyc',
    roles: ['TELLER', 'ADMIN'],
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
    const role = this.auth.currentUser()?.role;
    return NAV_ITEMS.filter((item) => !role || item.roles.includes(role));
  });
}