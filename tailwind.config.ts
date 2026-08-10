import type { Config } from 'tailwindcss';

const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: token('primary-50'),
          100: token('primary-100'),
          300: token('primary-300'),
          500: token('primary-500'),
          700: token('primary-700'),
          800: token('primary-800'),
          900: token('primary-900'),
        },
        neutral: {
          50: token('neutral-50'),
          100: token('neutral-100'),
          200: token('neutral-200'),
          300: token('neutral-300'),
          500: token('neutral-500'),
          600: token('neutral-600'),
          700: token('neutral-700'),
          800: token('neutral-800'),
          900: token('neutral-900'),
        },
        success: {
          50: token('success-50'),
          700: token('success-700'),
        },
        warning: {
          50: token('warning-50'),
          700: token('warning-700'),
        },
        error: {
          50: token('error-50'),
          700: token('error-700'),
        },
        info: {
          50: token('info-50'),
          700: token('info-700'),
        },
        ink: token('neutral-900'),
        forest: token('primary-900'),
        moss: token('primary-700'),
        mint: token('primary-100'),
        cream: token('neutral-50'),
        gold: token('warning-700'),
      },
      borderRadius: {
        control: 'var(--radius-control)',
        panel: 'var(--radius-panel)',
        overlay: 'var(--radius-overlay)',
      },
      boxShadow: {
        flat: 'var(--shadow-flat)',
        card: 'var(--shadow-card)',
        overlay: 'var(--shadow-overlay)',
        control: 'var(--shadow-control)',
        soft: 'var(--shadow-card)',
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['2rem', { lineHeight: '2.5rem' }],
      },
      spacing: {
        18: '4.5rem',
      },
    },
  },
  plugins: [],
} satisfies Config;
