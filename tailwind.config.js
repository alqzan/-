/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Tajawal', 'system-ui', 'sans-serif'],
      },
      colors: {
        // لوحة دافئة محايدة مناسبة قبل معرفة الجنس
        sage: {
          50: '#f1f6f2',
          100: '#dcebdf',
          200: '#bcd8c2',
          300: '#93bd9d',
          400: '#6b9e78',
          500: '#4f8460',
          600: '#3d694c',
          700: '#33553f',
          800: '#2b4435',
          900: '#24382c',
        },
        cream: {
          50: '#fdfbf7',
          100: '#fbf7f0',
          200: '#f5ecdd',
          300: '#eaddc6',
          400: '#dcc7a5',
        },
        peach: {
          100: '#fdeee6',
          200: '#fad8c7',
          300: '#f5b99e',
          400: '#ee9670',
          500: '#e07a4f',
        },
        blush: {
          100: '#fbe9ee',
          200: '#f5cdd8',
          300: '#eaa3b6',
        },
        sky: {
          100: '#e8f2f7',
          200: '#c8e0ec',
          300: '#98c4d9',
        },
      },
      borderRadius: {
        card: '1.25rem',
      },
      boxShadow: {
        soft: '0 4px 20px -6px rgba(61, 105, 76, 0.15)',
        card: '0 2px 12px -4px rgba(61, 105, 76, 0.12)',
      },
    },
  },
  plugins: [],
}
