import { definePreset } from '@primeng/themes';
import Aura from '@primeng/themes/aura';

/**
 * "Vault Teal" — SecureBank's brand color, mapped onto PrimeNG's semantic
 * `primary` scale via Aura's built-in teal palette. Every PrimeNG component
 * (buttons, inputs, checkboxes, etc.) picks this up automatically, and the
 * tailwindcss-primeui plugin exposes the same scale as Tailwind utilities
 * (bg-primary, text-primary-600, ...) so custom markup stays in sync with
 * component styling without re-declaring the palette twice.
 *
 * Keep this in sync with the `cssLayer.order` passed to providePrimeNG in
 * app.config.ts and with src/styles.scss's @layer declaration.
 */
export const SecureBankPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{teal.50}',
      100: '{teal.100}',
      200: '{teal.200}',
      300: '{teal.300}',
      400: '{teal.400}',
      500: '{teal.500}',
      600: '{teal.600}',
      700: '{teal.700}',
      800: '{teal.800}',
      900: '{teal.900}',
      950: '{teal.950}',
    },
  },
});
