import { useState } from "react";
import FieldError from "@/components/shared/FieldError";
import { useFieldErrors } from "@/hooks/useFieldErrors";

export const DOCUMENT_CATEGORIES = [
  { value: "contrato", label: "Contrato" },
  { value: "identificacion", label: "Identificación" },
  { value: "comprobante", label: "Comprobante" },
  { value: "escritura", label: "Escritura" },
  { value: "plano", label: "Plano" },
  { value: "otro", label: "Otro" },
];

/**
 * Campos mínimos para subir un documento: archivo, nombre, categoría y notas.
 *
 * No incluye el selector de "vincular a": está pensado para usarse donde la
 * entidad ya está decidida por el contexto (el expediente de un lote, de un
 * cliente…), así que preguntarlo sería redundante y permitiría equivocarse.
 *
 * @param {object} ctl Resultado de `useDocumentUpload`.
 */
export default function DocumentUploadFields({ ctl }) {
  const { form, setForm, fe, fileName, pickFile } = ctl;

  const set = (key) => (e) => {
    const v = e.target.value;
    setForm((p) => ({ ...p, [key]: v }));
    fe.clear(key);
  };

  return (
    <div className="space-y-3">
      <label className={`mobile-input flex cursor-pointer items-center justify-between${fe.errors.file ? " is-invalid" : ""}`}>
        <span className="truncate text-sm">{fileName || "Seleccionar archivo"}</span>
        <input type="file" className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} />
        <span className="text-xs font-semibold text-[#1E3D2B]">Examinar</span>
      </label>
      <FieldError msg={fe.errors.file} />

      <input
        className={fe.errors.name ? "mobile-input is-invalid" : "mobile-input"}
        value={form.name}
        onChange={set("name")}
        placeholder="Nombre descriptivo"
      />
      <FieldError msg={fe.errors.name} />

      <select className="mobile-input" value={form.category} onChange={set("category")}>
        {DOCUMENT_CATEGORIES.map((c) => (
          <option key={c.value} value={c.value}>{c.label}</option>
        ))}
      </select>

      <textarea
        className="mobile-input"
        rows="2"
        value={form.notes}
        onChange={set("notes")}
        placeholder="Notas del documento"
      />
    </div>
  );
}

/**
 * Estado y validación de una subida de documento.
 *
 * El archivo va en estado (no en un ref) para que el nombre se pinte al
 * elegirlo y el botón de guardar se habilite solo.
 */
export function useDocumentUpload(defaults = {}) {
  const [form, setForm] = useState({
    name: "",
    category: defaults.category || "contrato",
    notes: "",
  });
  const [file, setFile] = useState(null);
  const fe = useFieldErrors();

  const pickFile = (f) => {
    if (!f) return;
    setFile(f);
    fe.clear("file");
    // El nombre del archivo sirve de punto de partida, sin la extensión.
    setForm((p) => ({ ...p, name: p.name || f.name.replace(/\.[^.]+$/, "") }));
  };

  const validate = () => {
    const errs = {};
    if (!form.name?.trim()) errs.name = "Ponle un nombre al documento.";
    if (!file) errs.file = "Selecciona un archivo para subir.";
    fe.setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const reset = () => {
    setForm({ name: "", category: defaults.category || "contrato", notes: "" });
    setFile(null);
    fe.setErrors({});
  };

  return { form, setForm, fe, file, fileName: file?.name || "", pickFile, validate, reset };
}
