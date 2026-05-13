/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#4f46e5',
        'primary-light': '#e0e7ff',
        danger: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6',
      },
    },
  },
  plugins: [],
};
