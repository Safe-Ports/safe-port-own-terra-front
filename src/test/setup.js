import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./mocks/server";

// Levanta MSW antes de todos los tests y lo cierra al terminar.
beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// vitest.config.js no usa globals:true, así que RTL no detecta el afterEach
// automáticamente — hay que desmontar el DOM entre tests a mano.
afterEach(() => cleanup());
