/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          800: '#111827',
          900: '#0b1329',
          950: '#060a17',
        },
        gov: {
          blue: '#1d4ed8',
          dark: '#0f172a',
          surface: '#f8fafc',
          border: '#e2e8f0',
        }
      }
    },
  },
  plugins: [],
}
