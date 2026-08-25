import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./mocks/server";

// Node recientes exponen un `localStorage` experimental cuando reciben
// `--localstorage-file`. En algunos entornos de ejecución la ruta llega vacía y
// ese objeto pisa al Storage de jsdom, pero no implementa clear/removeItem.
// Normalizamos únicamente ese caso para que cada worker tenga un Storage web
// completo y determinista.
if (typeof window.localStorage?.clear !== "function") {
  const values = new Map();
  const memoryStorage = {
    get length() { return values.size; },
    key(index) { return [...values.keys()][index] ?? null; },
    getItem(key) { return values.get(String(key)) ?? null; },
    setItem(key, value) { values.set(String(key), String(value)); },
    removeItem(key) { values.delete(String(key)); },
    clear() { values.clear(); },
  };
  Object.defineProperty(window, "localStorage", { configurable: true, value: memoryStorage });
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: memoryStorage });
}

// Levanta MSW antes de todos los tests y lo cierra al terminar.
beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// vitest.config.js no usa globals:true, así que RTL no detecta el afterEach
// automáticamente — hay que desmontar el DOM entre tests a mano.
afterEach(() => cleanup());
