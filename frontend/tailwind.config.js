/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#FAF7F0",
        emerald: {
          DEFAULT: "#28665A",
          dark: "#205248",
        },
        terracotta: {
          DEFAULT: "#D98652",
          dark: "#b56b3d",
        },
      },
    },
  },
  plugins: [],
};