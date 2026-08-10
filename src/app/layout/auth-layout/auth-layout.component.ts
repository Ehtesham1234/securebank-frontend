import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

interface LedgerRow {
  ref: string;
  detail: string;
  amount: string;
}

@Component({
  selector: 'sb-auth-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './auth-layout.component.html',
})
export class AuthLayoutComponent {
  /** Illustrative only — this is the signature panel's ambient "ledger
   *  tape" animation, not real transaction data. Rendered twice in the
   *  template back-to-back so the scroll loops seamlessly. */
  readonly ledgerRows: LedgerRow[] = [
    { ref: '4102 •••• 7731', detail: 'Transfer settled', amount: '+2,140.00' },
    { ref: '9987 •••• 0142', detail: 'Card authorization', amount: '-84.32' },
    { ref: '5521 •••• 3390', detail: 'Direct deposit', amount: '+3,200.00' },
    { ref: '7743 •••• 1187', detail: 'Bill payment', amount: '-129.60' },
    { ref: '2209 •••• 5564', detail: 'Fixed deposit matured', amount: '+950.00' },
    { ref: '6631 •••• 9902', detail: 'ATM withdrawal', amount: '-200.00' },
    { ref: '3387 •••• 4471', detail: 'Loan disbursed', amount: '+12,500.00' },
    { ref: '8845 •••• 2216', detail: 'EMI payment', amount: '-540.00' },
  ];
}
