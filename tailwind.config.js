/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#006e1c',
          container: '#4caf50',
        },
        secondary: {
          DEFAULT: '#686000',
          container: '#f0e269',
        },
        tertiary: {
          DEFAULT: '#7a5649',
          container: '#bd9283',
        },
        background: '#fbf9f5',
        surface: '#fbf9f5',
        'on-surface': '#1b1c1a',
        'on-surface-variant': '#3f4a3c',
        'surface-container-low': '#f5f3ef',
        'surface-container': '#efeeea',
        'surface-container-high': '#eae8e4',
        'surface-container-highest': '#e4e2de',
        outline: '#6f7a6b',
        'outline-variant': '#becab9',
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'sans-serif'],
        handwritten: ['Long Cang', 'cursive'],
        artistic: ['ZCOOL XiaoWei', 'serif'],
      },
    },
  },
  plugins: [],
}
