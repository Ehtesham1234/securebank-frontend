import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export interface PasswordRuleCheck {
  key: string;
  label: string;
  test: (value: string) => boolean;
}

/**
 * Mirrors com.ehtesham.securebank.common.validation.StrongPasswordValidator
 * exactly: same minimum length, same character classes, same special-char
 * set. A password accepted here is guaranteed to be accepted by the API.
 * If the backend rule ever changes, update both this list and the regex
 * below together.
 */
export const PASSWORD_RULES: PasswordRuleCheck[] = [
  { key: 'length', label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { key: 'uppercase', label: 'One uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { key: 'lowercase', label: 'One lowercase letter', test: (v) => /[a-z]/.test(v) },
  { key: 'digit', label: 'One digit', test: (v) => /[0-9]/.test(v) },
  {
    key: 'special',
    label: 'One special character (@ $ ! % * ? & # ^ ( ) _ + - = [ ] { })',
    test: (v) => /[@$!%*?&#^()_+\-=\[\]{}]/.test(v),
  },
];

export function strongPasswordValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value: string = control.value ?? '';
    if (!value) {
      return null; // let `required` own the empty case
    }
    const failed = PASSWORD_RULES.filter((rule) => !rule.test(value));
    return failed.length ? { strongPassword: failed.map((r) => r.key) } : null;
  };
}
