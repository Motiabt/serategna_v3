/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Premium fintech neutrals (white / soft light grey)
        cream: '#FFFFFF',
        mist: '#F1F5F9',
        sand: '#F1F5F9',
        ink: '#0A192F', // Deep Trust Navy — text + darkest surfaces
        slate: '#1E293B', // secondary dark surface
        muted: '#64748B', // slate-500
        // brand = Electric Cyan accent (replaces green; signals growth & security)
        brand: {
          50: '#ECFEFF',
          100: '#CFFAFE',
          200: '#A5F3FC',
          400: '#22D3EE',
          500: '#06B6D4',
          600: '#0891B2',
          700: '#0E7490',
          800: '#155E75',
          900: '#164E63',
        },
        // Emerald reserved for SUCCESS status (wealth/growth)
        emerald: { 500: '#10B981', 600: '#059669', 700: '#047857' },
        mint: '#10B981',
        // Navy/indigo secondary accent (info)
        accent: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
        },
        amber: { accent: '#F59E0B' }, // pending
        crimson: '#E11D48', // alerts
        // Swipe-deck accent — bright cyan on navy
        feature: '#22D3EE',
        charcoal: '#0F2942',
      },
      fontFamily: {
        // Apple SF Pro Display first (native, geometric); Sora is the close
        // geometric cross-platform fallback. Bold/Heavy weights carry the brand.
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          'Sora',
          '"Helvetica Neue"',
          'system-ui',
          'sans-serif',
        ],
        display: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          'Sora',
          'system-ui',
          'sans-serif',
        ],
      },
      borderRadius: {
        '3xl': '1.6rem',
        '4xl': '2.25rem',
        '5xl': '2.75rem',
      },
      boxShadow: {
        soft: '0 10px 30px -16px rgba(10,25,47,0.16)',
        card: '0 12px 36px -18px rgba(10,25,47,0.18)',
        float: '0 30px 70px -30px rgba(10,25,47,0.40)',
        hero: '0 24px 48px -24px rgba(10,25,47,0.50)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.45s ease-out',
        float: 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
