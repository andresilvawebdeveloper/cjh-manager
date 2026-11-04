/** @type {import('tailwindcss').Config} */
module.exports = {
  // Modo escuro controlado pela classe "dark" no <html> (botão 🌙/☀️ no cabeçalho)
  darkMode: 'class',
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    // lib/ também tem classes de cores (ex: etiquetas da classificação)
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
