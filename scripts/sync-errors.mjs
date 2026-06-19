#!/usr/bin/env node
/**
 * Sincroniza el catálogo de errores del backend hacia el frontend.
 *
 * Lee `shared/errors.catalog.json` (generado por el backend con
 * `scripts/export_errors.py`) y escribe `src/errors/catalog.generated.js`.
 *
 * El backend es la fuente de verdad; este archivo es una COPIA generada — no editar a mano.
 *
 * Uso:
 *   node scripts/sync-errors.mjs            # regenera el .js
 *   node scripts/sync-errors.mjs --check    # falla si está desactualizado (CI)
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SHARED = resolve(__dirname, "../../shared/errors.catalog.json");
const OUTPUT = resolve(__dirname, "../src/errors/catalog.generated.js");

function build() {
  if (!existsSync(SHARED)) {
    console.error(`[sync-errors] No existe ${SHARED}. Corre el export del backend primero.`);
    process.exit(1);
  }
  const shared = JSON.parse(readFileSync(SHARED, "utf-8"));
  const header =
    "// AUTOGENERADO por scripts/sync-errors.mjs desde shared/errors.catalog.json.\n" +
    "// NO EDITAR A MANO. El backend (app/errors/catalog.py) es la fuente de verdad.\n\n";
  return (
    header +
    `export const CATALOG_VERSION = ${JSON.stringify(shared.version ?? 1)};\n\n` +
    `export const ERROR_CATALOG = ${JSON.stringify(shared.codes, null, 2)};\n`
  );
}

const content = build();

if (process.argv.includes("--check")) {
  const current = existsSync(OUTPUT) ? readFileSync(OUTPUT, "utf-8") : "";
  if (current !== content) {
    console.error("[sync-errors] catalog.generated.js desactualizado. Corre: npm run sync:errors");
    process.exit(1);
  }
  console.log("[sync-errors] OK: catálogo del front sincronizado.");
} else {
  writeFileSync(OUTPUT, content, "utf-8");
  const count = Object.keys(JSON.parse(readFileSync(SHARED, "utf-8")).codes).length;
  console.log(`[sync-errors] Escrito ${OUTPUT} (${count} códigos).`);
}
