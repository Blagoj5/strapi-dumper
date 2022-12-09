const plugin = require('tailwindcss/plugin')

/** @type {import('tailwindcss').Config} */
module.exports = {
   content: [
      "./pages/**/*.{js,ts,jsx,tsx}",
      "./components/**/*.{js,ts,jsx,tsx}",
      "./src/**/*.{js,ts,jsx,tsx}",
      "./assets/**/*.{js,ts,jsx,tsx}",
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
 plugins: [
    plugin(function({ addUtilities }) {
      addUtilities({
        /* Hide scrollbar for Chrome, Safari and Opera */
        '.no-scrollbar::-webkit-scrollbar': {
            display: 'none',
        },
        /* Hide scrollbar for IE, Edge and Firefox */
        '.no-scrollbar': {
          '-ms-overflow-style': 'none',  /* IE and Edge */
          'scrollbar-width': 'none',  /* Firefox */
        }
      })
    })
  ]
}
