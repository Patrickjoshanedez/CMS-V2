/** @type {import('tailwindcss').Config} */
import tailwindcssAnimate from 'tailwindcss-animate';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        overlay: 'hsl(var(--overlay))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        'destructive-text': 'hsl(var(--destructive-text))',
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        'paper-muted': 'hsl(var(--paper-muted-foreground))',
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        info: {
          DEFAULT: 'hsl(var(--info))',
          foreground: 'hsl(var(--info-foreground))',
        },
        chart: {
          1: 'hsl(var(--chart-1))',
          2: 'hsl(var(--chart-2))',
          3: 'hsl(var(--chart-3))',
          4: 'hsl(var(--chart-4))',
          5: 'hsl(var(--chart-5))',
          6: 'hsl(var(--chart-6))',
          7: 'hsl(var(--chart-7))',
          8: 'hsl(var(--chart-8))',
          9: 'hsl(var(--chart-9))',
          10: 'hsl(var(--chart-10))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
        brand: {
          orange: 'hsl(var(--brand-orange))',
          pink: 'hsl(var(--brand-pink))',
          purple: 'hsl(var(--brand-purple))',
          'deep-purple': 'hsl(var(--brand-deep-purple))',
        },
        'slide-brand': {
          navy: 'hsl(var(--slide-brand-navy))',
          gold: 'hsl(var(--slide-brand-gold))',
          orange: 'hsl(var(--slide-brand-orange))',
          ink: 'hsl(var(--slide-brand-ink))',
          slate: 'hsl(var(--slide-brand-slate))',
          green: 'hsl(var(--slide-brand-green))',
        },
        buksu: {
          navy: {
            800: '#152E5E',
            900: '#0B1B3D',
            950: '#071329',
          },
          blue: {
            500: '#2563EB',
            600: '#1A448A',
            700: '#14376F',
          },
          gold: {
            300: '#FDE047',
            400: '#F5C253',
            500: '#E5A823',
            600: '#C68A1B',
          },
          ochre: '#C68A1B',
        },
      },
      fontFamily: {
        serif: ['Newsreader', 'Playfair Display', 'DM Serif Display', 'Georgia', 'serif'],
        sans: ['Inter', 'DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        manuscript: '3px 3px 0px 0px rgba(11, 27, 61, 0.08)',
        'manuscript-dark': '3px 3px 0px 0px rgba(0, 0, 0, 0.4)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      textColor: {
        secondary: 'var(--text-secondary)',
        'text-secondary': 'var(--text-secondary)',
        'text-primary': 'var(--text-primary)',
        'text-muted': 'var(--text-muted)',
      },
      fontSize: {
        'fluid-h1': 'clamp(1.5rem, 1.143vw + 1.22rem, 2.25rem)',
        'fluid-h2': 'clamp(1.25rem, 0.762vw + 1.06rem, 1.75rem)',
        'fluid-h3': 'clamp(1.125rem, 0.381vw + 1.03rem, 1.375rem)',
        'fluid-body': 'clamp(0.875rem, 0.19vw + 0.83rem, 1rem)',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
