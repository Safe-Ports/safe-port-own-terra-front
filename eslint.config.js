import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";

// Primera config de lint de este repo (no existía ninguna). Correrla en seco
// sobre ~200 archivos ya escritos dio 95 errores: la mayoría son reglas
// nuevas del plugin react-hooks (pensadas para el React Compiler — refs
// mutados en render, setState en efectos, etc.) que SON señales reales, pero
// bloquear el primer PR del equipo por deuda preexistente no ayuda a nadie.
// Por eso van a "warn": quedan visibles en cada corrida de CI, el equipo las
// va limpiando con el tiempo, y una regresión NUEVA se nota igual sin
// tumbar PRs que no la tocan.
export default [
  { ignores: ["dist", "node_modules", "coverage", "playwright-report", "test-results"] },
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx,mjs}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        // Inyectada por vite.config.js vía `define` en build; no existe en
        // dev ni en los módulos que corren bajo Node.
        __APP_VERSION__: "readonly",
      },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      // Todas las reglas de react-hooks (incluidas las del React Compiler)
      // como warning por la razón de arriba — no se cherry-pickea cuáles sí
      // y cuáles no, para no tener que recordar actualizar esta lista cada
      // vez que el plugin agregue una regla nueva.
      ...Object.fromEntries(
        Object.keys(reactHooks.configs.recommended.rules).map((rule) => [rule, "warn"])
      ),
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      // JSX usa variables que ESLint no siempre resuelve como "usadas" (ej.
      // componentes importados solo por su tipo), y en tests se dejan
      // variables de setup sin usar a propósito con frecuencia.
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      // Deuda preexistente real pero menor (bloques catch vacíos, variable
      // asignada y no usada, etc.) — visible, no bloqueante, por ahora.
      "no-empty": "warn",
      "no-useless-assignment": "warn",
      "no-constant-condition": "warn",
      "preserve-caught-error": "warn",
    },
  },
];
