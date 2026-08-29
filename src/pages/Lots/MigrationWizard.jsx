import { useState } from "react";
import {
  HiOutlineArrowLeft, HiOutlineArrowDownTray, HiOutlineCheckCircle,
  HiOutlineMapPin, HiOutlineUserGroup, HiOutlineDocumentText,
} from "react-icons/hi2";
import ErrorBoundary from "@/components/shared/ErrorBoundary";
import FilePicker from "@/components/shared/FilePicker";
import { clientService } from "@/services/clientService";
import { lotService } from "@/services/lotService";
import { contractService } from "@/services/contractService";
import { enTandas, parseSheet } from "./parseSheet";

/* Migración inicial de una inmobiliaria que ya opera: su inventario, su cartera
   de clientes y sus contratos con el dinero ya cobrado.
   
   Las tres fases van en orden obligatorio porque cada una apoya a la siguiente:
   los contratos apuntan a lotes y clientes por su clave, y si esos no están, la
   tercera falla fila por fila. Entre paso y paso se muestra el conteo para
   contrastarlo contra los números de la inmobiliaria antes de seguir: descubrir
   que faltan 200 lotes en el paso 1 es barato; descubrirlo con los contratos ya
   creados, no. */

const PASOS = [
  {
    id: "lotes",
    icono: <HiOutlineMapPin />,
    titulo: "Lotes",
    resumen: "El inventario completo, de todos los fraccionamientos",
    columnas: "ID Lote · Fraccionamiento · Precios · Medidas · Servicios",
    extra: "El vendedor va en el paso 3: quién cerró la venta es un dato del contrato, no del inventario.",
    nota: "Todos entran como disponibles. El estado real lo define el contrato en el paso 3, para que un lote vendido siempre tenga su contrato detrás.",
  },
  {
    id: "clientes",
    icono: <HiOutlineUserGroup />,
    titulo: "Clientes",
    resumen: "La cartera, con la clave que usarán los contratos",
    columnas: "Clave Cliente · Nombre · Teléfono · Email",
    nota: "La Clave Cliente puede ser un número corrido (1, 2, 3…). Solo tiene que ser la misma en este archivo y en el de contratos.",
  },
  {
    id: "contratos",
    icono: <HiOutlineDocumentText />,
    titulo: "Contratos y pagos",
    resumen: "Las ventas y apartados, con lo ya cobrado",
    columnas: "Clave Cliente · ID Lote · Tipo · Fecha · Precio · Enganche · Plazo · Tasa · Cuotas pagadas",
    nota: "Genera la amortización de cada contrato y registra lo ya cobrado como saldo inicial. Corre en segundo plano: son miles de cuotas.",
  },
];

/* Cada importador reporta a su manera: en lotes los avisos son objetos con fila
   y mensaje, en clientes son texto suelto. La pantalla no tiene por qué saberlo,
   y renderizar un objeto directo tumba React entero. */
function comoTexto(item) {
  if (item == null) return "";
  if (typeof item === "string") return item;
  const fila = item.row ? `Fila ${item.row}` : "";
  const campo = item.field ? ` · ${item.field}` : "";
  const mensaje = item.message || JSON.stringify(item);
  return [fila + campo, mensaje].filter(Boolean).join(": ");
}

export default function MigrationWizard({ onSalir }) {
  /* Red propia: si algo del asistente revienta al renderizar, se muestra acá
     dentro con su motivo en vez de caer en el ErrorBoundary global, que tapa la
     pantalla completa y solo dice "algo se rompió". */
  return (
    <ErrorBoundary
      fallback={(err) => (
        <section className="rounded-[28px] border border-[#E8C4B8] bg-[#FBECE9] p-8">
          <div className="font-display text-[1.15rem] text-[#B4552F]">
            No se pudo mostrar el resultado del archivo
          </div>
          <p className="mt-2 text-[0.82rem] leading-relaxed text-[#8A4A32]">
            {String(err?.message || err)}
          </p>
          <button onClick={onSalir}
            className="mt-4 rounded-[9px] border border-[#B4552F] px-4 py-2 text-[0.8rem] font-bold text-[#B4552F]">
            Volver a Carga de Lotes
          </button>
        </section>
      )}
    >
      <Asistente onSalir={onSalir} />
    </ErrorBoundary>
  );
}

function Asistente({ onSalir }) {
  const [pasoActivo, setPasoActivo] = useState(0);
  const [archivos, setArchivos] = useState({});
  const [revisiones, setRevisiones] = useState({});   // resultado del dry-run
  const [hechos, setHechos] = useState({});           // ya escrito en la base
  const [ocupado, setOcupado] = useState(false);
  const [progreso, setProgreso] = useState(null);   // {hechas, total} de la fase 3
  const [error, setError] = useState("");

  /* La revisión y la carga son la MISMA llamada con dry_run distinto: si lo que
     se confirma no fuera exactamente lo que se revisó, el paso previo no serviría
     de nada. */
  const ALIAS_CONTRATOS = {
    numero_contrato: ["Numero de Contrato", "Número de Contrato", "contrato", "no. contrato"],
    clave_cliente:   ["Clave Cliente", "clave", "id cliente"],
    id_lote:         ["ID Lote", "lote", "id_lote"],
    fraccionamiento: ["Fraccionamiento", "proyecto", "desarrollo"],
    tipo:            ["Tipo", "operacion", "operación"],
    fecha:           ["Fecha", "fecha contrato"],
    precio:          ["Precio", "monto", "valor"],
    enganche:        ["Enganche", "anticipo"],
    plazo:           ["Plazo", "meses", "plazo meses"],
    tasa:            ["Tasa anual", "tasa", "interes", "interés"],
    cuotas_pagadas:  ["Cuotas pagadas", "pagadas", "mensualidades pagadas"],
    vendedor:        ["Vendedor", "asesor", "agente", "vendedor asignado"],
  };

  /* Los contratos van por tandas: cada una es una petición corta, el progreso es
     real, y si falla la tanda 7 se reintenta esa sola. Las otras dos fases caben
     en una llamada porque no generan cuotas. */
  const correrContratos = async (file, dryRun) => {
    const filas = await parseSheet(file, ALIAS_CONTRATOS);
    if (filas.length === 0) throw new Error("El archivo no tiene filas con datos");

    const tandas = enTandas(filas, 100);
    const total = { created: 0, skipped: 0, failed: 0, installments: 0,
                    opening_balance: 0, errors: [], imported: 0 };
    setProgreso({ hechas: 0, total: filas.length });

    for (const [i, tanda] of tandas.entries()) {
      const r = await contractService.importBatch(tanda, { dry_run: dryRun });
      total.created += r.created;
      total.skipped += r.skipped;
      total.failed += r.failed;
      total.installments += r.installments;
      total.opening_balance += Number(r.opening_balance || 0);
      for (const o of r.outcomes || []) {
        if (o.status === "failed") {
          total.errors.push({ row: o.row, field: o.contract_number, message: o.message });
        }
      }
      setProgreso({ hechas: Math.min((i + 1) * 100, filas.length), total: filas.length });
    }

    setProgreso(null);
    // Se normaliza a la misma forma que devuelven las otras dos fases.
    total.imported = total.created;
    total.updated = total.skipped;
    return total;
  };

  const correr = async (id, file, dryRun) => {
    if (id === "clientes") return clientService.importCsv(file, { dry_run: dryRun });
    if (id === "lotes") {
      const r = await lotService.importCsv(file, { mode: "tolerant", dry_run: dryRun });
      // En dry-run el importador de lotes devuelve imported=0 —no persistió nada—
      // y deja las filas válidas en preview_lots. Sin esto la revisión decía
      // "0 nuevos" y el botón de cargar quedaba deshabilitado para siempre.
      if (dryRun && Array.isArray(r.preview_lots)) {
        return { ...r, imported: r.preview_lots.length };
      }
      return r;
    }
    return correrContratos(file, dryRun);
  };

  const revisar = async () => {
    setOcupado(true); setError("");
    try {
      const r = await correr(paso.id, archivo, true);
      setRevisiones(p => ({ ...p, [paso.id]: r }));
    } catch (e) {
      setError(e?.response?.data?.error?.message || e.message || "No se pudo revisar el archivo");
    } finally { setOcupado(false); }
  };

  const confirmar = async () => {
    setOcupado(true); setError("");
    try {
      const r = await correr(paso.id, archivo, false);
      setHechos(p => ({ ...p, [paso.id]: r }));
    } catch (e) {
      setError(e?.response?.data?.error?.message || e.message || "No se pudo cargar el archivo");
    } finally { setOcupado(false); }
  };

  const descargarPlantilla = async () => {
    const blob = paso.id === "clientes" ? await clientService.importTemplate()
      : paso.id === "contratos" ? await contractService.importTemplate()
      : await lotService.importTemplateMigration();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${paso.id}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const paso = PASOS[pasoActivo];
  const archivo = archivos[paso.id] || null;
  const resultado = hechos[paso.id] || null;
  const revision = revisiones[paso.id] || null;
  const listo = Boolean(resultado);
  const bloqueado = pasoActivo > 0 && !hechos[PASOS[pasoActivo - 1].id];

  return (
    <section className="rounded-[28px] border border-[#E2E7E5] bg-white/88 p-8 shadow-[0_18px_40px_rgba(24,18,14,.08)]">
      <button onClick={onSalir}
        className="mb-6 inline-flex items-center gap-2 text-[0.82rem] font-semibold text-[#83867C] hover:text-forest">
        <HiOutlineArrowLeft /> Volver a Carga de Lotes
      </button>

      <div className="mx-auto max-w-[720px] text-center">
        <h2 className="font-display text-[1.65rem] text-forest">Migrar inmobiliaria completa</h2>
        <p className="mx-auto mt-2 max-w-[480px] text-[0.84rem] leading-relaxed text-[#83867C]">
          Para traer una operación que ya existe: inventario, cartera y contratos con su cobranza.
          Se hace una sola vez y en este orden.
        </p>
      </div>

      {/* Barra de pasos */}
      <div className="mx-auto mt-8 flex max-w-[720px] items-center">
        {PASOS.map((p, i) => {
          const completo = Boolean(hechos[p.id]);
          const activo = i === pasoActivo;
          return (
            <div key={p.id} className="flex flex-1 items-center">
              <button
                onClick={() => { if (i === 0 || hechos[PASOS[i - 1].id]) setPasoActivo(i); }}
                disabled={i > 0 && !hechos[PASOS[i - 1].id]}
                className="flex flex-1 flex-col items-center gap-1 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <span className={`flex h-11 w-11 items-center justify-center rounded-full text-[1.15rem] ${
                  completo ? "bg-[#D4EAE0] text-[#2F6A38]"
                    : activo ? "bg-[#355E3B] text-white" : "bg-[#EEF1F1] text-[#83867C]"}`}>
                  {completo ? <HiOutlineCheckCircle /> : p.icono}
                </span>
                <span className={`text-[0.76rem] font-bold ${activo ? "text-forest" : "text-[#83867C]"}`}>
                  {i + 1}. {p.titulo}
                </span>
              </button>
              {i < PASOS.length - 1 && (
                <span className={`mx-1 h-[2px] flex-1 ${completo ? "bg-[#6FAF6B]" : "bg-[#E2E7E5]"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Paso actual */}
      <div className="mx-auto mt-8 max-w-[560px]">
        <div className="rounded-[16px] border border-[#E2E7E5] bg-white p-6">
          <div className="font-display text-[1.15rem] text-forest">{paso.titulo}</div>
          <p className="mt-1 text-[0.8rem] text-[#83867C]">{paso.resumen}</p>

          <div className="mt-4 rounded-[11px] bg-[#EEF1F1] px-4 py-3">
            <div className="text-[0.66rem] font-bold uppercase tracking-[0.09em] text-[#83867C]">
              Columnas del archivo
            </div>
            <div className="mt-1 text-[0.78rem] leading-relaxed text-[#43453F]">{paso.columnas}</div>
          </div>

          <p className="mt-3 text-[0.75rem] leading-relaxed text-[#83867C]">{paso.nota}</p>
          {paso.extra && (
            <p className="mt-1.5 text-[0.75rem] leading-relaxed text-[#83867C]">{paso.extra}</p>
          )}

          {bloqueado ? (
            <div className="mt-5 rounded-[11px] border border-[#E2C08B] bg-[#FDF6E9] px-4 py-3 text-[0.78rem] text-[#8A6A2B]">
              Termina el paso anterior primero: este archivo se apoya en esos datos.
            </div>
          ) : listo ? (
            <div className="mt-5 rounded-[11px] border border-[#BEE0C6] bg-[#EDF7EF] px-4 py-3">
              <div className="text-[0.82rem] font-bold text-[#2F6A38]">
                {resultado.imported} cargados
                {resultado.updated ? ` · ${resultado.updated} actualizados` : ""}
              </div>
              <div className="mt-1 text-[0.74rem] text-[#4E7A55]">
                Compara este número con el de la inmobiliaria antes de seguir.
              </div>
            </div>
          ) : (
            <>
              <button onClick={descargarPlantilla}
                className="mt-5 inline-flex items-center gap-2 rounded-[9px] border border-[#355E3B] px-4 py-2 text-[0.78rem] font-bold text-[#355E3B]">
                <HiOutlineArrowDownTray /> Descargar plantilla
              </button>
              <div className="mt-4">
                <FilePicker
                  value={archivo}
                  onChange={(f) => { setArchivos((p) => ({ ...p, [paso.id]: f }));
                                     setRevisiones((p) => ({ ...p, [paso.id]: null })); setError(""); }}
                  accept=".xlsx,.xls,.csv"
                  hint="Excel o CSV. Se revisa antes de guardar nada."
                />
              </div>

              {revision && (
                <div className="mt-4 rounded-[11px] border border-[#E2E7E5] bg-[#FBFCFB] p-4">
                  <div className="text-[0.66rem] font-bold uppercase tracking-[0.09em] text-[#83867C]">
                    Así quedaría
                  </div>
                  <div className="mt-1 text-[0.86rem] font-bold text-forest">
                    {revision.imported} nuevos
                    {revision.updated ? ` · ${revision.updated} ya estaban` : ""}
                    {revision.failed ? ` · ${revision.failed} con problemas` : ""}
                  </div>
                  {paso.id === "contratos" && revision.installments > 0 && (
                    <div className="mt-1 text-[0.76rem] text-[#4E7A55]">
                      {revision.installments.toLocaleString("es-MX")} cuotas ·{" "}
                      {Number(revision.opening_balance).toLocaleString("es-MX", {
                        style: "currency", currency: "MXN", maximumFractionDigits: 0,
                      })} de saldo ya cobrado
                    </div>
                  )}
                  {revision.failed > 0 && (
                    <ul className="mt-2 max-h-[150px] space-y-1 overflow-y-auto text-[0.74rem] text-[#B4552F]">
                      {(revision.errors || []).slice(0, 8).map((er, i) => (
                        <li key={i}>{comoTexto(er)}</li>
                      ))}
                      {(revision.errors || []).length > 8 && (
                        <li className="text-[#83867C]">…y {revision.errors.length - 8} más</li>
                      )}
                    </ul>
                  )}
                  {(revision.warnings || []).length > 0 && (
                    <ul className="mt-2 space-y-1 text-[0.74rem] text-[#8A6A2B]">
                      {revision.warnings.slice(0, 4).map((w, i) => <li key={i}>{comoTexto(w)}</li>)}
                    </ul>
                  )}
                </div>
              )}

              {progreso && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-[0.75rem] text-[#83867C]">
                    <span>Procesando por tandas…</span>
                    <span className="tabular-nums">{progreso.hechas} de {progreso.total}</span>
                  </div>
                  <div className="mt-1.5 h-[6px] overflow-hidden rounded-full bg-[#EEF1F1]">
                    <div className="h-full rounded-full bg-[#6FAF6B] transition-all"
                         style={{ width: `${Math.round((progreso.hechas / progreso.total) * 100)}%` }} />
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-3 rounded-[10px] bg-[#FBECE9] px-4 py-2.5 text-[0.78rem] text-[#B4552F]">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {!listo && !bloqueado && !revision && (
          <button disabled={!archivo || ocupado} onClick={() => { revisar(); }}
            className="mt-4 w-full rounded-[10px] border-2 border-[#355E3B] px-4 py-3 text-[0.85rem] font-bold text-[#355E3B] disabled:opacity-40">
            {ocupado ? "Revisando…" : "Revisar archivo"}
          </button>
        )}

        {!listo && !bloqueado && revision && (
          <button disabled={ocupado || revision.imported + (revision.updated || 0) === 0}
            onClick={() => { confirmar(); }}
            className="mt-4 w-full rounded-[10px] bg-[#355E3B] px-4 py-3 text-[0.85rem] font-bold text-white disabled:opacity-40">
            {ocupado ? "Cargando…" : `Cargar ${revision.imported + (revision.updated || 0)} registros`}
          </button>
        )}

        {listo && pasoActivo < PASOS.length - 1 && (
          <button onClick={() => setPasoActivo(pasoActivo + 1)}
            className="mt-4 w-full rounded-[10px] bg-[#355E3B] px-4 py-3 text-[0.85rem] font-bold text-white">
            Continuar al paso {pasoActivo + 2}
          </button>
        )}

        {listo && pasoActivo === PASOS.length - 1 && (
          <div className="mt-4 rounded-[12px] border border-[#BEE0C6] bg-[#EDF7EF] p-5 text-center">
            <div className="font-display text-[1.05rem] text-forest">Migración completa</div>
            <p className="mt-1 text-[0.78rem] text-[#4E7A55]">
              {hechos.lotes?.imported ?? 0} lotes · {hechos.clientes?.imported ?? 0} clientes ·{" "}
              {hechos.contratos?.imported ?? 0} contratos con{" "}
              {(hechos.contratos?.installments ?? 0).toLocaleString("es-MX")} cuotas.
            </p>
          </div>
        )}
      </div>

      <p className="mx-auto mt-8 max-w-[560px] text-center text-[0.72rem] leading-relaxed text-[#A0A39A]">
        Cada paso revisa el archivo antes de escribir. Los contratos se cargan por tandas de 100:
        si una falla, se reintenta esa sola.
      </p>
    </section>
  );
}
