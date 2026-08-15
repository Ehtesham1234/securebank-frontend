import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { TagModule } from 'primeng/tag';
import { ErrorResponse } from '../../../core/models/api-response.model';
import { CardResponse, CardStatus } from '../../../core/models/card.model';
import { CardsService } from '../cards.service';

@Component({
  selector: 'sb-cards-list',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CurrencyPipe,
    DatePipe,
    ButtonModule,
    DialogModule,
    InputNumberModule,
    TagModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cards-list.component.html',
})
export class CardsListComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly service = inject(CardsService);

  /** cardId currently running a block/unblock call — disables that card's
   *  button so a double-click can't fire two requests. */
  readonly actionInFlight = signal<number | null>(null);

  private readonly revealedCvvs = signal<ReadonlyMap<number, string>>(new Map());
  private readonly cvvLoading = signal<ReadonlySet<number>>(new Set());

  readonly payBillTarget = signal<CardResponse | null>(null);
  readonly payBillSubmitting = signal(false);
  readonly payBillError = signal<string | null>(null);

  readonly payBillForm = this.fb.nonNullable.group({
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
  });

  ngOnInit(): void {
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

  toggleBlock(card: CardResponse): void {
    this.actionInFlight.set(card.id);
    const action$ = card.status === 'BLOCKED' ? this.service.unblock(card.id) : this.service.block(card.id);
    action$.subscribe({
      next: () => this.actionInFlight.set(null),
      error: () => this.actionInFlight.set(null),
    });
  }

  isCvvRevealed(cardId: number): boolean {
    return this.revealedCvvs().has(cardId);
  }

  isCvvLoading(cardId: number): boolean {
    return this.cvvLoading().has(cardId);
  }

  getRevealedCvv(cardId: number): string | undefined {
    return this.revealedCvvs().get(cardId);
  }

  /** Fetches fresh each time it's revealed rather than caching indefinitely
   *  — mirrors the backend's own "derived on demand, never stored"
   *  discipline for the CVV (see CardsService.getCvv). Hiding it again
   *  discards the value entirely, not just the display. */
  toggleCvv(cardId: number): void {
    if (this.isCvvRevealed(cardId)) {
      this.revealedCvvs.update((map) => {
        const next = new Map(map);
        next.delete(cardId);
        return next;
      });
      return;
    }

    this.cvvLoading.update((set) => new Set(set).add(cardId));
    this.service.getCvv(cardId).subscribe({
      next: (res) => {
        this.cvvLoading.update((set) => {
          const next = new Set(set);
          next.delete(cardId);
          return next;
        });
        this.revealedCvvs.update((map) => new Map(map).set(cardId, res.cvv));
      },
      error: () => {
        this.cvvLoading.update((set) => {
          const next = new Set(set);
          next.delete(cardId);
          return next;
        });
      },
    });
  }

  openPayBill(card: CardResponse): void {
    this.payBillTarget.set(card);
    this.payBillError.set(null);
    // Defaults to a full payoff — the backend caps to the outstanding
    // amount anyway if they leave it as-is, and it's the most common case.
    this.payBillForm.reset({ amount: card.outstandingBill });
  }

  closePayBill(): void {
    this.payBillTarget.set(null);
  }

  submitPayBill(): void {
    const card = this.payBillTarget();
    if (!card || this.payBillForm.invalid) {
      this.payBillForm.markAllAsTouched();
      return;
    }

    this.payBillError.set(null);
    this.payBillSubmitting.set(true);
    const { amount } = this.payBillForm.getRawValue();

    this.service.payBill(card.id, amount!).subscribe({
      next: () => {
        this.payBillSubmitting.set(false);
        this.closePayBill();
      },
      error: (err: unknown) => {
        this.payBillSubmitting.set(false);
        // Covers both INSUFFICIENT_FUNDS (savings balance too low) and the
        // ACCOUNT_OPERATION_FAILED minimum-payment-amount message — both
        // are plain-message 400s the backend already words clearly.
        if (err instanceof HttpErrorResponse && err.status === 400) {
          const body = err.error as ErrorResponse | undefined;
          if (body?.message && !body.validationErrors) {
            this.payBillError.set(body.message);
          }
        }
      },
    });
  }
}