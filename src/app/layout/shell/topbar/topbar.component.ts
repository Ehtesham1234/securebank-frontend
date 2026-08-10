import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { Router } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { MenuModule } from 'primeng/menu';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'sb-topbar',
  standalone: true,
  imports: [MenuModule, AvatarModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './topbar.component.html',
})
export class TopbarComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);

  readonly menuToggle = output<void>();

  readonly email = computed(() => this.auth.currentUser()?.email ?? '');
  readonly initial = computed(() => (this.email().charAt(0) || '?').toUpperCase());

  readonly menuItems: MenuItem[] = [
    {
      label: 'Log out',
      icon: 'pi pi-sign-out',
      command: () => this.logout(),
    },
  ];

  private logout(): void {
    this.auth.logout().subscribe(() => {
      this.notify.info("You've been logged out.");
      void this.router.navigate(['/auth/login']);
    });
  }
}
