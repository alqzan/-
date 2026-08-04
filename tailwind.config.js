/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // خط ثمانية بعائلاته الثلاث: الواجهة بالـ Sans، العناوين بالـ Serif Display،
        // والنصوص الطويلة (الرسائل، كتاب الذكريات) بالـ Serif Text.
        sans: ['Thmanyah Sans', 'system-ui', 'sans-serif'],
        display: ['Thmanyah Serif Display', 'Thmanyah Sans', 'serif'],
        serif: ['Thmanyah Serif Text', 'Thmanyah Sans', 'serif'],
      },
      colors: {
        // ===== الهوية: ورق دافئ + حبر + طين =====
        paper: {
          50: '#FDFBF7',
          100: '#F8F3EA',
          200: '#F1E9DB',
          300: '#E7DCC9',
          400: '#D8C9B2',
        },
        ink: {
          900: '#1B1714',
          800: '#2A2320',
          700: '#453B34',
          600: '#5C5048',
          500: '#77695E',
          400: '#93857A',
          300: '#B0A396',
          200: '#D2C7B8',
          100: '#E7DFD3',
        },
        clay: {
          50: '#FBF1EB',
          100: '#F4DED1',
          200: '#E8C0AB',
          300: '#D49B7C',
          400: '#C0703F',
          500: '#A9532A',
          600: '#8C4020',
          700: '#6E301A',
        },
        moss: {
          50: '#F0F3EE',
          100: '#DFE6DB',
          200: '#C2D0BC',
          500: '#4E6B52',
          600: '#3C5540',
        },
        brass: {
          50: '#F9F2E1',
          100: '#EFE2C4',
          200: '#DFC993',
          500: '#96762F',
          600: '#775C22',
        },
        line: '#E8DFD1',
      },
      borderRadius: {
        card: '1.125rem',
        sheet: '1.75rem',
      },
      boxShadow: {
        // ظلال دافئة (بُنّية) بدل الرمادي — تندمج مع خلفية الورق
        card: '0 1px 2px rgba(43, 33, 25, 0.04), 0 8px 24px -16px rgba(43, 33, 25, 0.25)',
        lift: '0 2px 6px rgba(43, 33, 25, 0.06), 0 18px 40px -20px rgba(43, 33, 25, 0.35)',
        sheet: '0 -8px 40px -12px rgba(43, 33, 25, 0.35)',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
      },
      keyframes: {
        rise: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fade: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        sheetUp: {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
      },
      animation: {
        rise: 'rise 0.4s cubic-bezier(0.22, 0.61, 0.36, 1) both',
        fade: 'fade 0.25s ease both',
        'sheet-up': 'sheetUp 0.32s cubic-bezier(0.22, 0.61, 0.36, 1) both',
      },
    },
  },
  plugins: [],
}
