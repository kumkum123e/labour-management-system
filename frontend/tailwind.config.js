/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#1e40af", dark: "#1e3a8a", light: "#3b82f6" },
        sidebar: "#0f172a",
      },
    },
  },
  plugins: [],
};
