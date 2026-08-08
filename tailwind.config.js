/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      // Fuente ÚNICA de verdad = variables CSS en src/styles/index.css (:root).
      // Tailwind solo las REFERENCIA; así un color se define en un solo lugar y
      // queda listo para theming (dark mode = redefinir los tokens en :root).
      colors: {
        forest: "var(--deep)",
        moss: "var(--mid)",
        leaf: "var(--leaf)",
        light: "var(--light)",
        cream: "var(--cream)",
        sand: "var(--sf2)",
        line: "var(--bd)",
        surface: "var(--sf)",
        muted: "var(--muted)",
        danger: "var(--danger)",
        ink: "var(--tx)",
        ink2: "var(--tx2)"
      },
      fontFamily: {
        display: ["'Playfair Display'", "serif"],
        sans: ["Outfit", "Inter", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"]
      },
      boxShadow: {
        soft: "var(--sh)",
        panel: "var(--sh2)"
      }
    }
  },
  plugins: []
};
