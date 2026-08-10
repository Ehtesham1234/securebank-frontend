/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'selector',
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      fontFamily: {
        // Display face: used narrowly for hero/auth headings only (see SKILL notes in styles.scss)
        display: ['"Fraunces"', 'ui-serif', 'Georgia', 'serif'],
        // Body/UI face: everything else
        sans: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        // Ledger face: every currency amount, account/card number, and OTP digit renders in this
        // tabular monospace — the app's one consistent signature detail (see README "Design system").
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        // Muted antique-gold accent — used sparingly: active-nav rail, verified badges,
        // the auth-layout signature panel. Never used for large surfaces or body text.
        gold: {
          50: '#FBF6EC',
          100: '#F4E8CC',
          200: '#E7D3A2',
          300: '#DEC08A',
          400: '#C7A468',
          500: '#B08D57',
          600: '#8F7143',
          700: '#6E5734',
        },
        // Neutral ink scale — cool graphite, deliberately NOT warm cream, used for text/backgrounds
        ink: {
          50: '#F4F6F8',
          100: '#E7EAEE',
          200: '#D3D9E0',
          400: '#5B6577',
          600: '#333D4E',
          800: '#1B222E',
          900: '#101521',
        },
      },
      keyframes: {
        'ledger-scroll': {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(-50%)' },
        },
      },
      animation: {
        // Duplicated content scrolls exactly one copy's height, then loops
        // seamlessly — see auth-layout.component.html for the markup this
        // pairs with. Disabled entirely under prefers-reduced-motion via
        // the global media query in styles.scss.
        'ledger-scroll': 'ledger-scroll 40s linear infinite',
      },
    },
  },
  plugins: [require('tailwindcss-primeui')],
};
