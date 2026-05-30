/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        forest: "#1E3D2B",
        moss: "#355E3B",
        leaf: "#6FAF6B",
        light: "#A7CBA1",
        cream: "#FBFAF6",
        sand: "#F1EEE6",
        line: "#DCDAD2"
      },
      fontFamily: {
        display: ["'Playfair Display'", "serif"],
        sans: ["Outfit", "Inter", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"]
      },
      boxShadow: {
        soft: "0 1px 3px rgba(30,61,43,.06), 0 4px 12px rgba(30,61,43,.07)",
        panel: "0 18px 40px rgba(30,61,43,.12), 0 20px 40px rgba(30,61,43,.11)"
      }
    }
  },
  plugins: []
};
