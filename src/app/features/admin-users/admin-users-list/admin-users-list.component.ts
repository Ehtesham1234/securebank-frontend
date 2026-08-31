import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SharedModule } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { Role, UserStatus } from '../../../core/models/enums';
import { AdminUsersService } from '../admin-users.service';

@Component({
  selector: 'sb-admin-users-list',
  standalone: true,
  imports: [TableModule, SharedModule, ButtonModule, InputTextModule, TagModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-users-list.component.html',
})
export class AdminUsersListComponent implements OnInit {
  readonly service = inject(AdminUsersService);
  private readonly router = inject(Router);

  readonly searchTerm = signal('');

  ngOnInit(): void {
    this.service.refresh();
  }

  onSearchInput(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  submitSearch(): void {
    this.service.refresh(this.searchTerm());
  }

  statusSeverity(status: UserStatus): 'success' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'PENDING_KYC':
        return 'warn';
      case 'SUSPENDED':
      case 'CLOSED':
        return 'danger';
    }
  }

  roleSeverity(role: Role): 'secondary' | 'info' | 'contrast' {
    switch (role) {
      case 'ADMIN':
        return 'contrast';
      case 'TELLER':
        return 'info';
      case 'CUSTOMER':
        return 'secondary';
    }
  }

  openUser(id: number | null | undefined): void {
    if (id == null) return;
    this.router.navigate(['/admin/users', id]);
  }
}