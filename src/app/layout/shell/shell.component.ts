import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SidebarComponent } from './sidebar/sidebar.component';
import { TopbarComponent } from './topbar/topbar.component';

@Component({
  selector: 'sb-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, SidebarComponent, TopbarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shell.component.html',
})
export class ShellComponent {
  private readonly auth = inject(AuthService);

  readonly mobileNavOpen = signal(false);

  readonly isPendingKyc = computed(() => this.auth.currentUser()?.userStatus === 'PENDING_KYC');

  closeMobileNav(): void {
    this.mobileNavOpen.set(false);
  }
}
