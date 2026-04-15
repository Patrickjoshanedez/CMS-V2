/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        panel: '0 24px 80px rgba(0, 0, 0, 0.35)',
      },
      colors: {
        control: {
          ink: '#07110f',
          panel: '#0d1715',
          edge: '#1f302d',
          amber: '#d7b24c',
          emerald: '#5dbb74',
          rose: '#e36a6a',
          slate: '#92a4a0',
        },
      },
    },
  },
  plugins: [],
};
