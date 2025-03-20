/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#B28AFF',
          DEFAULT: '#9D6AFF',
          dark: '#8256E0'
        },
        secondary: {
          light: '#8A83FF',
          DEFAULT: '#6C63FF',
          dark: '#5A52E0'
        },
        success: '#38B2AC',
        danger: '#E53E3E',
        background: '#F8F9FD',
        text: {
          primary: '#161C2D',
          secondary: '#506690'
        }
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 6px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.08)',
        elevated: '0 8px 16px rgba(157, 106, 255, 0.16)'
      },
      borderRadius: {
        'card': '12px',
        'button': '25px',
        'badge': '20px',
      },
      spacing: {
        '72': '18rem',
        '80': '20rem',
        '96': '24rem',
      }
    },
  },
  plugins: [],
};
