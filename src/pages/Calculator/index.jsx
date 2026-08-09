import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { currency } from "@/services/formatters";
import { calculatorService } from "@/services/calculatorService";
import { extractVariables, evaluate, buildFlatSchedule, FormulaError } from "@/services/formulaEngine";

import { useAppContext } from "@/context/AppContext";
import { useLandsGuide } from "@/context/LandsGuideContext";
import GuideModal from "@/components/shared/GuideModal";

const APP_KEY = "lands";
const EXAMPLE = "(Precio_Lote - Enganche) * (1 + (Tasa / 100)) / Plazo";

const EMPTY = { id: null, name: "", description: "", formula: "", is_active: false };

const norm = (s) => String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f_]/g, "");

/* Heurísticas para proyectar la tabla en modo prueba (variables abiertas) */
function guessMonths(vars, vals) {
  const v = vars.find((x) => /(plazo|mes|month|term)/.test(norm(x)));
  return v ? vals[v] : "";
}
function guessPrincipal(vars, vals) {
  const pr = vars.find((x) => /(principal|financ|saldo|capital)/.test(norm(x)));
  if (pr) return vals[pr];
  const precio = vars.find((x) => /(precio|monto|valor|total)/.test(norm(x)));
  if (precio) {
    const eng = vars.find((x) => /(enganche|down|inicial|anticipo)/.test(norm(x)));
    return Math.max(0, (Number(vals[precio]) || 0) - (eng ? Number(vals[eng]) || 0 : 0));
  }
  return "";
}

function CalculatorPage() {
  const { showToast, showError } = useAppContext();
  const qc = useQueryClient();
  const [showGuide, setShowGuide] = useState(false);
  useLandsGuide(() => setShowGuide(true));

  const LIST_KEY = ["calculators", APP_KEY];
  const { data: list = [], isLoading } = useQuery({
    queryKey: LIST_KEY,
    queryFn: () => calculatorService.list({ app_key: APP_KEY }),
    staleTime: 60_000,
  });

  const [open, setOpen]           = useState(false);       // editor visible
  const [editor, setEditor]       = useState(EMPTY);
  const [vars, setVars]           = useState([]);          // nombres detectados
  const [testValues, setTestValues] = useState({});        // {nombre: valor}
  const [result, setResult]       = useState(null);
  const [evalError, setEvalError] = useState("");
  const [saving, setSaving]       = useState(false);
  const [pendingId, setPendingId] = useState(null);        // id en operación (activar/eliminar)
  const [proj, setProj]           = useState({ months: "", principal: "" }); // override de proyección

  const isEditing = Boolean(editor.id);

  /* ── Cargar una calculadora en el editor ── */
  const loadIntoEditor = (calc) => {
    setOpen(true);
    setEditor(calc ? { ...calc } : EMPTY);
    const detected = calc ? extractVariables(calc.formula) : [];
    setVars(detected);
    setTestValues(Object.fromEntries(detected.map((v) => [v, ""])));
    setProj({ months: "", principal: "" });
    setResult(null);
    setEvalError("");
  };

  const newCalculator = () => loadIntoEditor(null);

  /* ── Analizar la fórmula (genera los campos dinámicos) ── */
  const analyze = () => {
    const detected = extractVariables(editor.formula);
    if (!detected.length) {
      setEvalError("No se detectaron variables. Revisa la fórmula.");
      setVars([]);
      return;
    }
    setVars(detected);
    setTestValues((prev) => Object.fromEntries(detected.map((v) => [v, prev[v] ?? ""])));
    setResult(null);
    setEvalError("");
  };

  /* ── Recalcular resultado al cambiar valores de prueba ── */
  useEffect(() => {
    if (!vars.length || !editor.formula.trim()) { setResult(null); return; }
    const allFilled = vars.every((v) => testValues[v] !== "" && testValues[v] != null);
    if (!allFilled) { setResult(null); setEvalError(""); return; }
    try {
      setResult(evaluate(editor.formula, testValues));
      setEvalError("");
    } catch (err) {
      setResult(null);
      setEvalError(err instanceof FormulaError ? err.message : "No se pudo evaluar la fórmula");
    }
  }, [vars, testValues, editor.formula]);

  const setTestValue = (name, value) =>
    setTestValues((p) => ({ ...p, [name]: value }));

  /* ── Proyección de la tabla de amortización (modo prueba) ── */
  const effMonths    = proj.months !== "" ? proj.months : guessMonths(vars, testValues);
  const effPrincipal = proj.principal !== "" ? proj.principal : guessPrincipal(vars, testValues);
  const schedule = useMemo(() => {
    if (result == null || !(Number(effMonths) > 0) || !(Number(effPrincipal) > 0)) return null;
    return buildFlatSchedule(result, effPrincipal, effMonths);
  }, [result, effMonths, effPrincipal]);

  /* ── Guardar (crear o actualizar) ── */
  const save = async () => {
    if (!editor.name.trim())   return showToast("Ponle un nombre a la calculadora");
    if (!editor.formula.trim()) return showToast("La fórmula no puede estar vacía");
    setSaving(true);
    try {
      const body = {
        name: editor.name.trim(),
        description: editor.description?.trim() || null,
        formula: editor.formula.trim(),
      };
      const saved = isEditing
        ? await calculatorService.update(editor.id, body)
        : await calculatorService.create({ ...body, app_key: APP_KEY });
      // Actualiza la caché directamente (sin refetch) para que la lista refleje al instante.
      qc.setQueryData(LIST_KEY, (old = []) =>
        isEditing ? old.map((c) => (c.id === saved.id ? saved : c)) : [saved, ...old]
      );
      loadIntoEditor(saved);
      showToast(isEditing ? "Calculadora actualizada" : "Calculadora creada");
    } catch (err) {
      showError(err, "No se pudo guardar la calculadora");
    } finally {
      setSaving(false);
    }
  };

  const activate = async (calc) => {
    if (calc.is_active || pendingId) return;
    setPendingId(calc.id);                 // muestra "Cargando…" en ese ítem
    try {
      await calculatorService.activate(calc.id);
      // Server confirmó: refleja el cambio (una sola activa por módulo).
      qc.setQueryData(LIST_KEY, (old = []) => old.map((c) => ({ ...c, is_active: c.id === calc.id })));
      if (editor.id === calc.id) setEditor((e) => ({ ...e, is_active: true }));
      showToast(`«${calc.name}» es ahora la calculadora activa`);
    } catch (err) {
      showError(err, "No se pudo activar la calculadora");
    } finally {
      setPendingId(null);
    }
  };

  const remove = async (calc) => {
    if (pendingId) return;
    if (!window.confirm(`¿Eliminar la calculadora «${calc.name}»? Las ventas pasadas conservan su fórmula.`)) return;
    setPendingId(calc.id);
    try {
      await calculatorService.delete(calc.id);
      qc.setQueryData(LIST_KEY, (old = []) => old.filter((c) => c.id !== calc.id));
      if (editor.id === calc.id) { setOpen(false); setEditor(EMPTY); }
      showToast("Calculadora eliminada");
    } catch (err) {
      showError(err, "No se pudo eliminar la calculadora");
    } finally {
      setPendingId(null);
    }
  };

  const copyExample = () => {
    setEditor((e) => ({ ...e, formula: e.formula?.trim() ? e.formula : EXAMPLE }));
    showToast("Ejemplo cargado en la fórmula");
  };

  return (
    <div className="calc-page space-y-4">
      <style>{`
        .calc-page .calc-item{cursor:pointer;border:1px solid var(--bd);background:var(--sf);
          border-radius:16px;padding:11px 13px;
          box-shadow:0 6px 16px rgba(30,61,43,.05);
          transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease;}
        .calc-page .calc-item:hover{transform:translateY(-2px);border-color:rgba(53,94,59,.40);
          box-shadow:0 12px 26px rgba(30,61,43,.09);}
        .calc-page .calc-item.sel{border-color:rgba(53,94,59,.58);
          background:linear-gradient(135deg,var(--tan-lt),var(--sf));
          box-shadow:inset 0 0 0 1px rgba(53,94,59,.14),0 12px 26px rgba(30,61,43,.09);}
        .calc-page .calc-switch{position:relative;width:40px;height:22px;border-radius:999px;border:none;flex-shrink:0;transition:background .16s;}
        .calc-page .calc-switch .knob{position:absolute;top:2px;width:18px;height:18px;border-radius:50%;background:#fff;
          transition:left .16s;box-shadow:0 1px 3px rgba(30,61,43,.25);}
        .calc-page .badge-active{display:inline-block;margin-top:6px;font-size:.62rem;font-weight:800;letter-spacing:.06em;
          color:var(--forest);background:var(--tan-lt);padding:2px 9px;border-radius:999px;}
        .calc-page .calc-panel{border:1px solid var(--bd);border-radius:18px;padding:16px;background:var(--sf2);
          box-shadow:0 12px 30px rgba(30,61,43,.06);}
        .calc-page .calc-result{display:flex;align-items:center;justify-content:space-between;
          background:linear-gradient(135deg,var(--tan-lt),var(--sf));border:1px solid rgba(53,94,59,.45);
          border-radius:14px;padding:12px 14px;box-shadow:0 8px 18px rgba(30,61,43,.08);}
        .calc-page .calc-empty{display:flex;align-items:center;justify-content:center;min-height:300px;}
        .calc-page .calc-tablewrap{overflow:auto;max-height:340px;border-radius:14px;border:1px solid var(--bd);
          box-shadow:0 8px 18px rgba(30,61,43,.05);}
        .calc-page .calc-loading{display:inline-flex;align-items:center;gap:6px;font-size:.7rem;font-weight:600;color:var(--mu);}
        .calc-page .calc-spinner{width:13px;height:13px;border-radius:50%;border:2px solid rgba(53,94,59,.25);
          border-top-color:var(--forest);animation:calc-spin .6s linear infinite;}
        @keyframes calc-spin{to{transform:rotate(360deg);}}
      `}</style>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold" style={{ color: "var(--tx,#1E3D2B)" }}>
            🧮 Calculadoras de financiamiento
          </div>
          <div className="text-xs" style={{ color: "var(--mu)" }}>
            Define la fórmula de la mensualidad. La <strong>activa</strong> se usa al concretar una venta.
          </div>
        </div>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: "minmax(260px, 340px) 1fr" }}>
        {/* ── Lista ── */}
        <div className="card" style={{ alignSelf: "start" }}>
          <div className="card-hd">
            <div className="card-title">Guardadas</div>
          </div>
          <div className="card-body" style={{ padding: 8, display: "flex", flexDirection: "column", gap: 8 }}>
            {isLoading && <div className="text-xs" style={{ color: "var(--mu)", padding: 12 }}>Cargando…</div>}
            {!isLoading && !list.length && (
              <div className="text-xs" style={{ color: "var(--mu)", padding: 12, textAlign: "center" }}>
                Sin calculadoras. Crea la primera con “+ Nueva”.
              </div>
            )}
            {list.map((calc) => {
              const selected = editor.id === calc.id && open;
              return (
                <div
                  key={calc.id}
                  className={`calc-item${selected ? " sel" : ""}`}
                  onClick={() => loadIntoEditor(calc)}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: ".85rem", color: "var(--tx)" }}>
                      {calc.name}
                    </span>
                    {pendingId === calc.id ? (
                      <span className="calc-loading"><span className="calc-spinner" />Cargando…</span>
                    ) : (
                      /* Switch activar */
                      <button
                        type="button"
                        className="calc-switch"
                        disabled={!!pendingId}
                        title={calc.is_active ? "Calculadora activa" : "Activar esta calculadora"}
                        onClick={(e) => { e.stopPropagation(); activate(calc); }}
                        style={{
                          cursor: calc.is_active ? "default" : "pointer",
                          background: calc.is_active ? "var(--forest)" : "var(--bd)",
                        }}
                      >
                        <span className="knob" style={{ left: calc.is_active ? 20 : 2 }} />
                      </button>
                    )}
                  </div>
                  {calc.description && (
                    <div style={{ fontSize: ".72rem", color: "var(--mu)", marginTop: 4, lineHeight: 1.4 }}>
                      {calc.description.length > 70 ? calc.description.slice(0, 70) + "…" : calc.description}
                    </div>
                  )}
                  {calc.is_active && <span className="badge-active">ACTIVA</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Editor / estado vacío ── */}
        {!open ? (
          <div className="card calc-empty">
            <div style={{ textAlign: "center", padding: 24 }}>
              <div style={{ fontSize: "2rem", marginBottom: 8 }}>🧮</div>
              <div style={{ fontWeight: 600, color: "var(--tx)", marginBottom: 4 }}>
                Crea o selecciona una calculadora
              </div>
              <div className="text-xs" style={{ color: "var(--mu)", marginBottom: 14 }}>
                Define la fórmula de la mensualidad y pruébala antes de guardar.
              </div>
              <button className="btn-p" onClick={newCalculator}>+ Nueva calculadora</button>
            </div>
          </div>
        ) : (
        <div className="card">
          <div className="card-hd">
            <div className="card-title">{isEditing ? "Editar calculadora" : "Nueva calculadora"}</div>
            <div style={{ display: "flex", gap: 8 }}>
              {isEditing && (
                <>
                  <button className="btn-s" style={{ padding: "4px 10px", fontSize: ".7rem" }} onClick={() => remove(editor)}>
                    🗑 Eliminar
                  </button>
                  <button className="btn-s" style={{ padding: "4px 10px", fontSize: ".7rem" }} onClick={newCalculator}>
                    + Nueva
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="card-body space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="fg">
                <label className="fl">Nombre</label>
                <input className="fi" value={editor.name}
                  onChange={(e) => setEditor((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Ej. Plan 12% interés simple" />
              </div>
              <div className="fg">
                <label className="fl">Descripción</label>
                <input className="fi" value={editor.description || ""}
                  onChange={(e) => setEditor((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Breve descripción del plan" />
              </div>
            </div>

            <div className="fg">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <label className="fl">Fórmula matemática</label>
                <button type="button" onClick={copyExample}
                  style={{ border: 0, background: "transparent", color: "var(--forest)", fontSize: ".7rem", fontWeight: 700, cursor: "pointer" }}>
                  Usar ejemplo →
                </button>
              </div>
              <textarea
                className="fi"
                style={{ fontFamily: "var(--font-body)", minHeight: 80, resize: "vertical" }}
                value={editor.formula}
                onChange={(e) => setEditor((p) => ({ ...p, formula: e.target.value }))}
                placeholder={EXAMPLE}
              />
              <div style={{ fontSize: ".68rem", color: "var(--mu)", marginTop: 4 }}>
                Operadores: <code>+ - * / % ^</code> · funciones: <code>min, max, abs, round, floor, ceil, sqrt, pow</code>.
                Las variables se detectan solas al analizar.
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" className="btn-s" onClick={analyze}>🔍 Analizar fórmula</button>
              <button type="button" className="btn-p" onClick={save} disabled={saving}>
                {saving ? "Guardando…" : "💾 Guardar configuración"}
              </button>
            </div>

            {/* ── Modo prueba ── */}
            {vars.length > 0 && (
              <div className="calc-panel">
                <div style={{ fontWeight: 600, fontSize: ".82rem", color: "var(--tx)", marginBottom: 10 }}>
                  Modo prueba — captura valores para ver la mensualidad
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  {vars.map((v) => (
                    <div className="fg" key={v}>
                      <label className="fl" style={{ fontFamily: "var(--font-body)", fontSize: ".72rem" }}>{v}</label>
                      <input className="fi" type="number" value={testValues[v] ?? ""}
                        onChange={(e) => setTestValue(v, e.target.value)} placeholder="0" />
                    </div>
                  ))}
                </div>

                {evalError && (
                  <div style={{ marginTop: 10, fontSize: ".75rem", color: "var(--danger)" }}>{evalError}</div>
                )}

                {result != null && !evalError && (
                  <div className="calc-result" style={{ marginTop: 12 }}>
                    <span style={{ fontSize: ".82rem", color: "var(--tx)" }}>Mensualidad calculada</span>
                    <strong style={{ fontSize: "1.1rem", color: "var(--forest)" }}>{currency(result)}</strong>
                  </div>
                )}

                {/* ── Proyección de la tabla de amortización ── */}
                {result != null && !evalError && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontWeight: 600, fontSize: ".8rem", color: "var(--tx)", marginBottom: 8 }}>
                      Tabla de amortización (proyección plana)
                    </div>
                    <div className="grid gap-3 md:grid-cols-2" style={{ marginBottom: 10 }}>
                      <div className="fg">
                        <label className="fl">Plazo (meses)</label>
                        <input className="fi" type="number" min="1" value={effMonths}
                          onChange={(e) => setProj((p) => ({ ...p, months: e.target.value }))} placeholder="Ej. 96" />
                      </div>
                      <div className="fg">
                        <label className="fl">Monto financiado</label>
                        <input className="fi" type="number" min="0" value={effPrincipal}
                          onChange={(e) => setProj((p) => ({ ...p, principal: e.target.value }))} placeholder="Precio − Enganche" />
                      </div>
                    </div>

                    {!schedule && (
                      <div style={{ fontSize: ".72rem", color: "var(--mu)" }}>
                        Indica el plazo y el monto financiado para proyectar la tabla.
                      </div>
                    )}

                    {schedule && (
                      <>
                        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 8, fontSize: ".75rem", color: "var(--mu)" }}>
                          <span>Total a pagar: <strong style={{ color: "var(--tx)" }}>{currency(schedule.totalPaid)}</strong></span>
                          <span>Interés total: <strong style={{ color: "var(--tx)" }}>{currency(schedule.totalInterest)}</strong></span>
                          <span>{schedule.rows.length} cuotas</span>
                        </div>
                        <div className="calc-tablewrap">
                          <table className="amort-table">
                            <thead>
                              <tr>
                                <th>Cuota</th><th>Saldo Inicial</th><th>Capital</th>
                                <th>Interés</th><th>Cuota</th><th>Saldo Final</th>
                              </tr>
                            </thead>
                            <tbody>
                              {schedule.rows.map((row) => (
                                <tr key={row.cuota}>
                                  <td>{row.cuota}</td>
                                  <td>{currency(row.balance)}</td>
                                  <td>{currency(row.capital)}</td>
                                  <td>{currency(row.interest)}</td>
                                  <td>{currency(row.payment)}</td>
                                  <td>{currency(row.ending)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        )}
      </div>

      <GuideModal
        open={showGuide}
        onClose={() => setShowGuide(false)}
        title="Calculadoras de financiamiento"
        subtitle="Crea fórmulas propias para la mensualidad y elige cuál se usa en las ventas."
        steps={[
          { title: "Lista de calculadoras", text: "A la izquierda ves tus calculadoras guardadas. El interruptor marca cuál está ACTIVA; solo una puede estarlo a la vez y es la que se aplica al concretar una venta." },
          { title: "Crear / editar", text: "Pulsa “+ Nueva” o toca una existente para cargarla en el editor. Escribe nombre, descripción y la fórmula matemática de la mensualidad." },
          { title: "Variables abiertas", text: "Nombra las variables como quieras dentro de la fórmula (ej. Precio_Lote, Enganche, Tasa, Plazo). Pulsa “Analizar fórmula” para que el sistema genere los campos de prueba." },
          { title: "Modo prueba", text: "Captura valores y verás la mensualidad y la tabla de amortización proyectada (ajusta plazo y monto financiado si hace falta), antes de guardar." },
          { title: "Inmutabilidad en ventas", text: "Al concretar una venta se guarda una copia exacta de la fórmula y los valores usados. Si editas la calculadora después, las ventas pasadas NO se recalculan." },
        ]}
      />
    </div>
  );
}

export default CalculatorPage;
