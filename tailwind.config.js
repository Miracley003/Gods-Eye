/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'matrix': '#00ff41',
        'cyber-green': '#10b981',
        'dark-bg': '#000000',
      },
      animation: {
        'matrix': 'matrix 2s linear infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        matrix: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' }
        },
        'pulse-glow': {
          '0%': { boxShadow: '0 0 5px #00ff41' },
          '100%': { boxShadow: '0 0 20px #00ff41, 0 0 30px #00ff41' }
        }
      }
    },
  },
  plugins: [],
}
