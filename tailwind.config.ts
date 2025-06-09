import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand Colors - Primary
        navy: {
          50: '#f0f4ff',
          100: '#e0e9ff',
          200: '#c7d6ff',
          300: '#a5b8ff',
          400: '#8191ff',
          500: '#5d6aff',
          600: '#4c4fff',
          700: '#3d3aeb',
          800: '#3230c7',
          900: '#2d2ba0',
          950: '#011B58', // Hero Navy
        },
        royal: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#0629D3', // Royal Blue
        },
        cloud: {
          50: '#ffffff',
          100: '#fafafa',
          200: '#f5f5f5',
          300: '#f0f0f0', // Cloud
          400: '#e5e5e5',
          500: '#d4d4d4',
          600: '#a3a3a3',
          700: '#737373',
          800: '#525252',
          900: '#404040',
          950: '#262626',
        },
        sky: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#ABE7FF', // Sky Blue
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        // Brand Colors - Secondary
        coral: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#F2555A', // Coral
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },
        marigold: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#FFA000', // Marigold
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },
        purple: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7c3aed',
          800: '#6b21a8',
          900: '#5326A5', // Purple
          950: '#3b0764',
        },
        mint: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#CDFDDA', // Mint
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        forest: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#014929', // Forest
          950: '#052e16',
        },
        // Jira-inspired semantic colors
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: {
          DEFAULT: '#011B58',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#F0F0F0',
          foreground: '#011B58',
        },
        accent: {
          DEFAULT: '#0629D3',
          foreground: '#ffffff',
        },
        muted: {
          DEFAULT: '#F0F0F0',
          foreground: '#737373',
        },
        card: {
          DEFAULT: '#ffffff',
          foreground: '#011B58',
        },
        border: '#e5e5e5',
        input: '#ffffff',
        ring: '#0629D3',
        destructive: {
          DEFAULT: '#F2555A',
          foreground: '#ffffff',
        },
        success: {
          DEFAULT: '#014929',
          foreground: '#ffffff',
        },
        warning: {
          DEFAULT: '#FFA000',
          foreground: '#ffffff',
        },
        info: {
          DEFAULT: '#ABE7FF',
          foreground: '#011B58',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Oxygen',
          'Ubuntu',
          'Fira Sans',
          'Droid Sans',
          'Helvetica Neue',
          'sans-serif',
        ],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      borderRadius: {
        'lg': '0.5rem',
        'md': '0.375rem',
        'sm': '0.25rem',
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(1, 27, 88, 0.05)',
        'DEFAULT': '0 1px 3px 0 rgba(1, 27, 88, 0.1), 0 1px 2px 0 rgba(1, 27, 88, 0.06)',
        'md': '0 4px 6px -1px rgba(1, 27, 88, 0.1), 0 2px 4px -1px rgba(1, 27, 88, 0.06)',
        'lg': '0 10px 15px -3px rgba(1, 27, 88, 0.1), 0 4px 6px -2px rgba(1, 27, 88, 0.05)',
        'xl': '0 20px 25px -5px rgba(1, 27, 88, 0.1), 0 10px 10px -5px rgba(1, 27, 88, 0.04)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
export default config 