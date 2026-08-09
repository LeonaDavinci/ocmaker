/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      colors: {
        picrew: {
          bg: '#f6f6f8',
          panel: '#ffffff',
          accent: '#ff6b8a',
          accentHover: '#ff5272',
          text: '#333333',
          muted: '#888888',
          border: '#e5e5ea',
        }
      }
    },
  },
  plugins: [],
};
