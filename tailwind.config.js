/** @type {import('tailwindcss').Config} */
module.exports = {
   content: [
      "./pages/**/*.{js,ts,jsx,tsx}",
      "./components/**/*.{js,ts,jsx,tsx}",
    ],  
  theme: {
    extend: {
      colors: {
        'bg-primary': 'hsl(230, 6%, 19%)',
        'card': 'hsl(232, 18%, 9%)',
        'primary': 'hsl(18, 86%, 54%)',
        'card-input': 'hsl(227, 9%, 19%)',
      }
    },
  },
  plugins: [],
}
