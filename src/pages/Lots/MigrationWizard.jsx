import { useEffect, useState } from "react";
import {
  HiOutlineArrowLeft, HiOutlineArrowDownTray, HiOutlineCheckCircle,
  HiOutlineMapPin, HiOutlineUserGroup, HiOutlineDocumentText,
} from "react-icons/hi2";
import ErrorBoundary from "@/components/shared/ErrorBoundary";
import FilePicker from "@/components/shared/FilePicker";
import PreviewTable from "./PreviewTable";
import { clientService } from "@/services/clientService";
import { lotService } from "@/services/lotService";
import { contractService } from "@/services/contractService";
import { enTandas, parseSheet } from "./parseSheet";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "@/context/AppContext";
import { inmuebleService } from "@/services/inmuebleService";

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
    resumen: "Los lotes del fraccionamiento elegido",
    columnas: "ID Lote · Precios · Medidas · Servicios",
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

/* El avance se guarda por organización. Una migración de 1500 lotes no se hace
   de un tirón: se carga una fase, se verifica el conteo con la inmobiliaria, y se
   vuelve al día siguiente. Perder el avance al recargar obligaría a repetir
   cargas que ya escribieron en la base. */
const CLAVE_AVANCE = "ot_migracion";

/** Cuántos registros quedaron en el sistema tras un paso: nuevos más actualizados. */
function total(resultado) {
  if (!resultado) return 0;
  return (resultado.imported || 0) + (resultado.updated || 0);
}

function leerAvance(orgId) {
  if (!orgId) return null;
  try {
    const todo = JSON.parse(window.localStorage.getItem(CLAVE_AVANCE) || "{}");
    const avance = todo[orgId] || null;
    // Un avance sin fraccionamiento viene de antes de que se eligiera uno:
    // retomarlo deja la pantalla diciendo "3 de 3 pasos completados" y "elige el
    // fraccionamiento" al mismo tiempo.
    return avance?.fracId ? avance : null;
  } catch {
    return null;
  }
}

function guardarAvance(orgId, avance) {
  if (!orgId) return;
  try {
    const todo = JSON.parse(window.localStorage.getItem(CLAVE_AVANCE) || "{}");
    if (avance) todo[orgId] = avance;
    else delete todo[orgId];
    window.localStorage.setItem(CLAVE_AVANCE, JSON.stringify(todo));
  } catch {
    /* sin espacio o en modo privado: se sigue sin persistir */
  }
}

function Asistente({ onSalir }) {
  const { currentUser } = useAppContext();
  const orgId = currentUser?.organization?.id || null;
  /* La migración es de UN fraccionamiento: sus lotes, y los contratos de esos
     lotes. Sin elegirlo, el importador no sabe dónde poner nada y los lotes
     quedarían repartidos por nombre, que es frágil. */
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { fracs = [], showToast } = useAppContext();
  const guardado = leerAvance(orgId);
  const [fracId, setFracId] = useState(guardado?.fracId ?? "");
  const [fracNuevo, setFracNuevo] = useState("");
  const [creandoFrac, setCreandoFrac] = useState(false);
  const [planoSubiendo, setPlanoSubiendo] = useState(false);
  const fracElegido = fracs.find((f) => String(f.id) === String(fracId)) || null;

  /* Deja la pantalla lista para otro proyecto. Lo cargado no se toca: son datos
     de un fraccionamiento distinto y no se pisan entre sí. */
  const empezarOtra = () => {
    guardarAvance(orgId, null);
    setHechos({}); setRevisiones({}); setArchivos({});
    setPasoActivo(0); setFracId(""); setVerTabla(false); setError("");
  };

  /* El plano es lo que hace usable el fraccionamiento: sin él, la vista de lotes
     queda vacía y hay que volver después a buscarlo. Pedirlo acá, mientras se
     tiene el proyecto en la cabeza, evita ese viaje de vuelta. */
  const subirPlano = async (file) => {
    if (!file || !fracId) return;
    setPlanoSubiendo(true);
    try {
      await inmuebleService.uploadMap(fracId, file);
      await qc.invalidateQueries({ queryKey: ["inmuebles"] });
      showToast?.("Plano cargado");
    } catch {
      showToast?.("No se pudo subir el plano; puedes cargarlo después", "warning");
    } finally {
      setPlanoSubiendo(false);
    }
  };

  const crearFrac = async () => {
    const nombre = fracNuevo.trim();
    if (!nombre) return;
    setCreandoFrac(true);
    try {
      const creado = await inmuebleService.create({ name: nombre });
      // Para que aparezca en el desplegable sin recargar.
      await qc.invalidateQueries({ queryKey: ["inmuebles"] });
      setFracId(creado.id);
      setFracNuevo("");
      showToast?.(`Fraccionamiento "${nombre}" creado`);
    } catch {
      showToast?.("No se pudo crear el fraccionamiento", "warning");
    } finally {
      setCreandoFrac(false);
    }
  };
  const [pasoActivo, setPasoActivo] = useState(guardado?.pasoActivo ?? 0);
  const [archivos, setArchivos] = useState({});
  const [revisiones, setRevisiones] = useState({});   // resultado del dry-run
  const [hechos, setHechos] = useState(guardado?.hechos ?? {});   // ya escrito en la base
  const [ocupado, setOcupado] = useState(false);
  const [progreso, setProgreso] = useState(null);   // {hechas, total} de la fase 3
  const [verTabla, setVerTabla] = useState(false);
  const [filasVistas, setFilasVistas] = useState([]);

  // Solo se persiste lo que ya se escribió en la base; los archivos elegidos no,
  // porque el navegador no puede volver a abrirlos por su cuenta.
  useEffect(() => {
    if (Object.keys(hechos).length > 0) guardarAvance(orgId, { pasoActivo, hechos, fracId });
  }, [orgId, pasoActivo, hechos, fracId]);
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
    const filas = (await parseSheet(file, ALIAS_CONTRATOS)).map((f) => ({
      // El fraccionamiento se asume: la migración es de uno solo, así que no hace
      // falta repetirlo en cada una de las 1500 filas.
      ...f,
      fraccionamiento: f.fraccionamiento || fracElegido?.name || "",
    }));
    if (filas.length === 0) throw new Error("El archivo no tiene filas con datos");

    setFilasVistas(filas);
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
      // update_existing: en una migración se reintenta el archivo, y rechazar por
      // código duplicado convertiría un reintento en 1500 errores.
      const r = await lotService.importCsv(file, {
        fraccionamiento_id: fracId || undefined,
        mode: "tolerant", dry_run: dryRun, update_existing: true,
      });
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
      // Sin esto, ir a ver los lotes recién cargados muestra la lista vieja y
      // hay que refrescar a mano — como si la migración no hubiera hecho nada.
      for (const llave of ["lots", "inmuebles", "clients", "contracts", "payments"]) {
        qc.invalidateQueries({ queryKey: [llave] });
      }
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
  const sinFrac = !fracId;
  const bloqueado = !listo && (sinFrac || (pasoActivo > 0 && !hechos[PASOS[pasoActivo - 1].id]));

  return (
    <section className="rounded-[28px] border border-[#E2E7E5] bg-white/88 p-8 shadow-[0_18px_40px_rgba(24,18,14,.08)]">
      <button onClick={onSalir}
        className="mb-6 inline-flex items-center gap-2 text-[0.82rem] font-semibold text-[#83867C] hover:text-forest">
        <HiOutlineArrowLeft /> Volver a Carga de Lotes
      </button>

      {Object.keys(hechos).length > 0 && (
        <div className="mx-auto mb-5 flex max-w-[720px] items-center justify-between gap-4 rounded-[12px] border border-[#BEE0C6] bg-[#EDF7EF] px-4 py-3">
          <span className="text-[0.78rem] leading-relaxed text-[#2F6A38]">
            Retomando la migración de <b>{fracElegido?.name || "un fraccionamiento"}</b>:{" "}
            {Object.keys(hechos).length} de {PASOS.length} pasos completados. Lo ya cargado no
            se vuelve a subir.
          </span>
          <button
            onClick={() => {
              if (!window.confirm(
                "Se olvida el avance de esta pantalla. Lo ya cargado en la base NO se borra: " +
                "al volver a subir los archivos se actualizarán en vez de duplicarse.")) return;
              empezarOtra();
            }}
            className="shrink-0 text-[0.75rem] font-bold text-[#4E7A55] underline"
          >
            Empezar de nuevo
          </button>
        </div>
      )}

      <div className="mx-auto max-w-[720px] text-center">
        <h2 className="font-display text-[1.65rem] text-forest">Migrar un fraccionamiento</h2>
        <p className="mx-auto mt-2 max-w-[480px] text-[0.84rem] leading-relaxed text-[#83867C]">
          Trae un fraccionamiento que ya opera: sus lotes, los clientes que compraron
          y sus contratos con la cobranza al día. Se hace una vez por fraccionamiento,
          y en este orden.
        </p>
      </div>

      {/* El fraccionamiento primero: todo lo demás cuelga de él. */}
      <div className="mx-auto mt-7 max-w-[560px] rounded-[14px] border border-[#E2E7E5] bg-white p-5">
        <div className="text-[0.66rem] font-bold uppercase tracking-[0.09em] text-[#83867C]">
          ¿De qué fraccionamiento?
        </div>
        {Object.keys(hechos).length > 0 ? (
          <div className="mt-2 text-[0.88rem] font-bold text-forest">
            {fracElegido?.name || "—"}
            <span className="ml-2 text-[0.72rem] font-normal text-[#83867C]">
              (no se puede cambiar con la migración empezada)
            </span>
          </div>
        ) : (
          <>
            <select
              value={fracId}
              onChange={(e) => setFracId(e.target.value)}
              className="mt-2 w-full rounded-[10px] border border-[#D8DEDB] bg-white px-3 py-2.5 text-[0.85rem]"
            >
              <option value="">— Elegir fraccionamiento —</option>
              {fracs.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <div className="mt-3 flex items-end gap-2">
              <div className="flex-1">
                <div className="text-[0.72rem] text-[#83867C]">¿No está en la lista? Créalo</div>
                <input
                  value={fracNuevo}
                  onChange={(e) => setFracNuevo(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && crearFrac()}
                  placeholder="Nombre del fraccionamiento"
                  className="mt-1 w-full rounded-[10px] border border-[#D8DEDB] px-3 py-2 text-[0.82rem]"
                />
              </div>
              <button
                onClick={crearFrac}
                disabled={!fracNuevo.trim() || creandoFrac}
                className="rounded-[9px] border border-[#355E3B] px-4 py-2 text-[0.78rem] font-bold text-[#355E3B] disabled:opacity-40"
              >
                {creandoFrac ? "Creando…" : "Crear"}
              </button>
            </div>
          </>
        )}
      </div>

      {/* El plano: sin él la vista de lotes queda vacía. */}
      {fracId && (
        <div className="mx-auto mt-3 max-w-[560px] rounded-[14px] border border-[#E2E7E5] bg-white p-5">
          <div className="text-[0.66rem] font-bold uppercase tracking-[0.09em] text-[#83867C]">
            Plano del fraccionamiento
          </div>
          {fracElegido?.image_url ? (
            <div className="mt-2 flex items-center gap-3">
              <img src={fracElegido.image_url} alt=""
                className="h-12 w-16 rounded-[8px] object-cover" />
              <span className="text-[0.8rem] font-bold text-[#2F6A38]">Ya tiene plano</span>
            </div>
          ) : (
            <>
              <p className="mt-1 text-[0.75rem] leading-relaxed text-[#83867C]">
                Opcional, pero sin plano la vista de lotes queda vacía y hay que volver
                a cargarlo después.
              </p>
              <div className="mt-3">
                <FilePicker
                  value={null}
                  onChange={subirPlano}
                  accept="image/jpeg,image/png,image/webp"
                  hint={planoSubiendo ? "Subiendo…" : "Imagen del plano: JPG, PNG o WebP."}
                />
              </div>
            </>
          )}
        </div>
      )}

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
              {sinFrac
                ? "Elige primero el fraccionamiento: los lotes tienen que entrar a alguno."
                : "Termina el paso anterior primero: este archivo se apoya en esos datos."}
            </div>
          ) : listo ? (
            <div className="mt-5 rounded-[11px] border border-[#BEE0C6] bg-[#EDF7EF] px-4 py-3">
              {/* Adelante el total, que es el número que se compara contra los
                  de la inmobiliaria. Nuevos contra actualizados es un detalle de
                  si es la primera vez que se sube el archivo o la tercera. */}
              <div className="text-[0.9rem] font-bold text-[#2F6A38]">
                {total(resultado).toLocaleString("es-MX")}{" "}
                {paso.id === "lotes" ? "lotes" : paso.id === "clientes" ? "clientes" : "contratos"}{" "}
                en el sistema
              </div>
              {resultado.updated > 0 && (
                <div className="mt-0.5 text-[0.73rem] text-[#4E7A55]">
                  {resultado.imported > 0
                    ? `${resultado.imported} nuevos · ${resultado.updated} ya estaban y se actualizaron`
                    : "Ya estaban cargados de una subida anterior; se actualizaron con este archivo."}
                </div>
              )}
              {resultado.failed > 0 && (
                <div className="mt-1 text-[0.78rem] font-bold text-[#B4552F]">
                  {resultado.failed} filas no entraron
                </div>
              )}
              {(resultado.errors || []).length > 0 && (
                <ul className="mt-1.5 max-h-[120px] space-y-1 overflow-y-auto text-[0.73rem] text-[#B4552F]">
                  {resultado.errors.slice(0, 6).map((er, i) => <li key={i}>{comoTexto(er)}</li>)}
                </ul>
              )}
              <div className="mt-1 text-[0.74rem] text-[#4E7A55]">
                Compara este total con el de la inmobiliaria antes de seguir.
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
                                     setRevisiones((p) => ({ ...p, [paso.id]: null }));
                                     setVerTabla(false); setError(""); }}
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
                    {total(revision).toLocaleString("es-MX")} filas
                    van a entrar
                  </div>
                  {/* Cero filas tiene dos causas muy distintas —el archivo está
                      vacío, o trae solo los ejemplos— y confundirlas hace perder
                      un rato largo. */}
                  {total(revision) === 0 && (
                    <div className="mt-2 rounded-[10px] border border-[#E2C08B] bg-[#FDF6E9] px-3 py-2.5 text-[0.76rem] leading-relaxed text-[#8A6A2B]">
                      {(revision.warnings || []).some((w) => String(comoTexto(w)).includes("ejemplo"))
                        ? "Es la plantilla sin llenar: sus filas de ejemplo empiezan con # y se ignoran. Reemplázalas por tus datos."
                        : "No se encontró ninguna fila con datos. Revisa que los encabezados coincidan con los de la plantilla."}
                    </div>
                  )}
                  {(revision.updated > 0 || revision.failed > 0) && (
                    <div className="mt-0.5 text-[0.74rem] text-[#83867C]">
                      {[
                        revision.imported ? `${revision.imported} nuevas` : null,
                        revision.updated ? `${revision.updated} ya existían y se actualizan` : null,
                        revision.failed ? `${revision.failed} con problemas` : null,
                      ].filter(Boolean).join(" · ")}
                    </div>
                  )}
                  {/* Reconciliación: el sistema no puede saber si un lote SIN
                      contrato está mal —uno disponible legítimamente no tiene—,
                      pero sí puede dar el número para contrastarlo contra lo que
                      dice la inmobiliaria. */}
                  {paso.id === "contratos" && (() => {
                    const lotesCargados = total(hechos.lotes);
                    const conContrato = total(revision);
                    const sinContrato = lotesCargados - conContrato;
                    if (lotesCargados === 0 || sinContrato <= 0) return null;
                    return (
                      <div className="mt-2 rounded-[10px] border border-[#D9E2EC] bg-[#F5F8FB] px-3 py-2.5 text-[0.75rem] leading-relaxed text-[#41556B]">
                        <b>{sinContrato} de los {lotesCargados} lotes</b> no aparecen en este
                        archivo. Está bien si siguen disponibles; si la inmobiliaria dice que
                        están vendidos o apartados, falta esa fila.
                      </div>
                    );
                  })()}

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
                  {(() => {
                    const filas = paso.id === "lotes" ? (revision.preview_lots || [])
                      : paso.id === "clientes" ? (revision.preview || [])
                      : filasVistas;
                    if (filas.length === 0) return null;
                    return (
                      <>
                        <button onClick={() => setVerTabla(!verTabla)}
                          className="mt-2 text-[0.75rem] font-bold text-[#355E3B] underline">
                          {verTabla ? "Ocultar detalle" : `Ver las ${filas.length} filas`}
                        </button>
                        {verTabla && <PreviewTable fase={paso.id} filas={filas} />}
                      </>
                    );
                  })()}

                  {(() => {
                    // El recuadro de arriba ya explica el caso de la plantilla sin
                    // llenar; repetirlo acá hace dudar de si son dos problemas.
                    const avisos = (revision.warnings || [])
                      .filter((w) => !String(comoTexto(w)).includes("filas de ejemplo"));
                    if (avisos.length === 0) return null;
                    return (
                      <ul className="mt-2 space-y-1 text-[0.74rem] text-[#8A6A2B]">
                        {avisos.slice(0, 4).map((w, i) => <li key={i}>{comoTexto(w)}</li>)}
                      </ul>
                    );
                  })()}
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
          <button disabled={ocupado || total(revision) === 0}
            onClick={() => { confirmar(); }}
            className="mt-4 w-full rounded-[10px] bg-[#355E3B] px-4 py-3 text-[0.85rem] font-bold text-white disabled:opacity-40">
            {ocupado ? "Cargando…" : `Cargar ${total(revision)} registros`}
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
              {/* Total, no solo los nuevos: en un reintento —o cuando una fase ya
                  se había corrido— todo entra como actualizado, y leer solo
                  `imported` mostraba ceros sobre datos que sí están cargados. */}
              {[
                [total(hechos.lotes), "lotes"],
                [total(hechos.clientes), "clientes"],
                [total(hechos.contratos), "contratos"],
              ].map(([n, etiqueta]) => `${n.toLocaleString("es-MX")} ${etiqueta}`).join(" · ")}
              {hechos.contratos?.installments
                ? `, con ${hechos.contratos.installments.toLocaleString("es-MX")} cuotas`
                : ""}.
            </p>
            {/* Terminar sin poder ver el resultado deja al usuario preguntándose
                si de verdad quedó cargado. */}
            {!fracElegido?.image_url && (
              <div className="mt-3 rounded-[10px] border border-[#E2C08B] bg-[#FDF6E9] px-4 py-2.5 text-[0.76rem] leading-relaxed text-[#8A6A2B]">
                Quedó sin plano: la vista de lotes va a verse vacía hasta que cargues uno.
              </div>
            )}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              {fracId && (
                <button
                  onClick={() => navigate(`/fraccionamientos?frac=${fracId}`)}
                  className="rounded-[9px] bg-[#355E3B] px-5 py-2.5 text-[0.8rem] font-bold text-white"
                >
                  Ver los lotes de {fracElegido?.name || "el fraccionamiento"} →
                </button>
              )}
              {/* Una inmobiliaria tiene varios proyectos: terminar uno no puede
                  dejar el asistente encerrado en él. */}
              <button
                onClick={empezarOtra}
                className="rounded-[9px] border border-[#355E3B] px-5 py-2.5 text-[0.8rem] font-bold text-[#355E3B]"
              >
                Migrar otro fraccionamiento
              </button>
            </div>
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
