import type { Config } from 'tailwindcss';

/**
 * Colors/fonts point at CSS custom properties, not literal values, so a
 * tone/theme switch (spec Section 28: "the interface may use subtle,
 * immersive, alternate, or plain presentation") only ever changes
 * `app/globals.css` variable definitions — it can never change underlying
 * facts, tier, warnings, or accessibility data, because those never live in
 * a theme file to begin with.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--qb-color-bg)',
        surface: 'var(--qb-color-surface)',
        text: 'var(--qb-color-text)',
        muted: 'var(--qb-color-muted)',
        accent: 'var(--qb-color-accent)',
        'accent-contrast': 'var(--qb-color-accent-contrast)',
        border: 'var(--qb-color-border)',
        danger: 'var(--qb-color-danger)',
        warning: 'var(--qb-color-warning)',
        success: 'var(--qb-color-success)',
      },
      fontFamily: {
        display: ['var(--qb-font-display)'],
        body: ['var(--qb-font-body)'],
      },
    },
  },
  plugins: [],
};

export default config;
