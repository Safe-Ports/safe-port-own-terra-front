import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HiOutlineFolderPlus } from "react-icons/hi2";
import FieldError from "@/components/shared/FieldError";
import { useFieldErrors } from "@/hooks/useFieldErrors";
import { folderService } from "@/services/folderService";

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
export default function DocumentUploadFields({ ctl, defaultFolderAppKey }) {
  const { form, setForm, fe, fileName, pickFile } = ctl;
  const queryClient = useQueryClient();
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolder, setNewFolder] = useState("");
  const [savingFolder, setSavingFolder] = useState(false);

  const { data: folders = [] } = useQuery({
    queryKey: ["folders"],
    queryFn: () => folderService.list(),
  });

  // Sugerir la carpeta de la app desde la que se sube (la que se crea sola por
  // vertical). Sólo la primera vez: si el usuario elige otra, se respeta.
  useEffect(() => {
    if (!defaultFolderAppKey || form.folderId || ctl.folderTouched) return;
    const own = folders.find((f) => f.app_key === defaultFolderAppKey);
    if (own) setForm((p) => ({ ...p, folderId: String(own.id) }));
  }, [folders, defaultFolderAppKey, form.folderId, ctl.folderTouched, setForm]);

  const set = (key) => (e) => {
    const v = e.target.value;
    setForm((p) => ({ ...p, [key]: v }));
    fe.clear(key);
  };

  const createFolder = async () => {
    const name = newFolder.trim();
    if (!name || savingFolder) return;
    setSavingFolder(true);
    try {
      const created = await folderService.create({ name, parent_id: null });
      await queryClient.invalidateQueries({ queryKey: ["folders"] });
      await queryClient.invalidateQueries({ queryKey: ["document-folders"] });
      ctl.setFolderTouched(true);
      setForm((p) => ({ ...p, folderId: String(created.id) }));
      setNewFolder("");
      setCreatingFolder(false);
    } finally {
      setSavingFolder(false);
    }
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

      {/* Dónde queda guardado. Sin esto el archivo caía en la raíz del Vault,
          incluso teniendo la organización una carpeta por app. */}
      {creatingFolder ? (
        <div className="doc-folder-new">
          <input
            className="mobile-input"
            value={newFolder}
            onChange={(e) => setNewFolder(e.target.value)}
            placeholder="Nombre de la carpeta"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && createFolder()}
          />
          <div className="doc-folder-new-actions">
            <button type="button" className="btn-p" disabled={!newFolder.trim() || savingFolder} onClick={createFolder}>
              {savingFolder ? "Creando…" : "Crear y usar"}
            </button>
            <button type="button" className="btn-s" onClick={() => { setCreatingFolder(false); setNewFolder(""); }}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="doc-folder-row">
          <select
            className="mobile-input"
            value={form.folderId || ""}
            onChange={(e) => { ctl.setFolderTouched(true); setForm((p) => ({ ...p, folderId: e.target.value })); }}
          >
            <option value="">Sin carpeta (raíz)</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
          <button
            type="button"
            className="doc-folder-new-btn"
            onClick={() => setCreatingFolder(true)}
            title="Crear una carpeta"
          >
            <HiOutlineFolderPlus /> Nueva
          </button>
        </div>
      )}

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
    folderId: defaults.folderId || "",
    notes: "",
  });
  const [file, setFile] = useState(null);
  // Una vez que el usuario elige carpeta, deja de sugerirse la de la app.
  const [folderTouched, setFolderTouched] = useState(false);
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
    setForm({ name: "", category: defaults.category || "contrato", folderId: defaults.folderId || "", notes: "" });
    setFile(null);
    setFolderTouched(false);
    fe.setErrors({});
  };

  return {
    form, setForm, fe, file, fileName: file?.name || "",
    pickFile, validate, reset, folderTouched, setFolderTouched,
  };
}
