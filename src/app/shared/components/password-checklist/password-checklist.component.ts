import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PASSWORD_RULES } from '../../validators/password-policy.validator';

@Component({
  selector: 'sb-password-checklist',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './password-checklist.component.html',
})
export class PasswordChecklistComponent {
  readonly value = input('');

  readonly rules = computed(() =>
    PASSWORD_RULES.map((rule) => ({ ...rule, met: rule.test(this.value()) })),
  );
}
