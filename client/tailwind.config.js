/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        vf: {
          bg: '#0B0C15',
          canvas: '#0D0E1A',
          card: '#121528',
          cardHover: '#181C35',
          surface: '#15182D',
          border: 'rgba(255, 255, 255, 0.08)',
          borderSubtle: 'rgba(255, 255, 255, 0.05)',
          borderHover: 'rgba(255, 255, 255, 0.15)',
          input: '#15182E',
          inputBorder: '#2B2F4E',
        },
        navy: {
          800: '#111827',
          900: '#0b1329',
          950: '#060a17',
        },
        gov: {
          blue: '#1d4ed8',
          dark: '#0f172a',
          surface: '#121528',
          border: 'rgba(255, 255, 255, 0.08)',
        }
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(to right, #f43f5e, #9333ea, #4f46e5)',
        'sunset-gradient': 'linear-gradient(to right, #fbbf24, #f43f5e, #9333ea)',
        'hero-gradient': 'linear-gradient(to right, #171936, #221B47, #451B54)',
        'card-gradient': 'linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 100%)',
      },
      boxShadow: {
        'glow-rose': '0 0 25px -5px rgba(244, 63, 94, 0.3)',
        'glow-purple': '0 0 25px -5px rgba(147, 51, 234, 0.3)',
        'glow-subtle': '0 10px 30px -10px rgba(0, 0, 0, 0.5)',
      }
    },
  },
  plugins: [],
}
