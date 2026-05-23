/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        forest: "#183024",
        moss: "#2A7A50",
        cream: "#F4F1EB",
        sand: "#F0EDE5",
        line: "#DDD8CE"
      },
      boxShadow: {
        soft: "0 1px 3px rgba(0,0,0,.06), 0 4px 12px rgba(0,0,0,.07)",
        panel: "0 8px 24px rgba(0,0,0,.09), 0 20px 40px rgba(0,0,0,.11)"
      }
    }
  },
  plugins: []
};
