import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SharedModule } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { CardStatus } from '../../../core/models/card.model';
import { AdminCardSearchField, AdminCardsService } from '../admin-cards.service';

@Component({
  selector: 'sb-admin-cards-list',
  standalone: true,
  imports: [CurrencyPipe, TableModule, SharedModule, ButtonModule, InputTextModule, TagModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-cards-list.component.html',
})
export class AdminCardsListComponent implements OnInit {
  readonly service = inject(AdminCardsService);

  readonly searchField = signal<AdminCardSearchField>('search');
  readonly searchValue = signal('');
  readonly actionInFlight = signal<number | null>(null);

  ngOnInit(): void {
    this.service.refresh();
  }

  onSearchFieldChange(event: Event): void {
    this.searchField.set((event.target as HTMLSelectElement).value as AdminCardSearchField);
  }

  onSearchValueInput(event: Event): void {
    this.searchValue.set((event.target as HTMLInputElement).value);
  }

  submitSearch(): void {
    this.service.refresh(this.searchField(), this.searchValue());
  }

  clearSearch(): void {
    this.searchValue.set('');
    this.service.refresh();
  }

  statusSeverity(status: CardStatus): 'success' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'BLOCKED':
        return 'warn';
      case 'CANCELLED':
      case 'EXPIRED':
        return 'danger';
    }
  }

  toggleBlock(card: { id: number; status: CardStatus }): void {
    this.actionInFlight.set(card.id);
    const action$ = card.status === 'BLOCKED' ? this.service.unblock(card.id) : this.service.block(card.id);
    action$.subscribe({
      next: () => this.actionInFlight.set(null),
      error: () => this.actionInFlight.set(null),
    });
  }
}