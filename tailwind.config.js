/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'bg-main': '#0a0e17',
        'bg-header': '#1a2332',
        'bg-row': '#0d1117',
        'bg-highlight': '#1a2a1a',
        'text-title': '#00bfff',
        'premium-positive': '#00ff00',
        'premium-negative': '#ff4444',
        'funding-positive': '#ff9500',
        'funding-negative': '#00aaff',
      },
    },
  },
  plugins: [],
}
