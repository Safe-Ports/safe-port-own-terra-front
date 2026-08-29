import { useRef, useState } from "react";
import { HiOutlinePaperClip, HiOutlineXMark, HiOutlineArrowUpTray } from "react-icons/hi2";

/* Selector de archivo: el input nativo se ve de otra época y no dice nada del
   archivo elegido. Este muestra nombre y peso, y deja quitarlo sin reabrir el
   explorador. El input real queda oculto pero accesible por teclado. */
export default function FilePicker({ value, onChange, accept, hint }) {
  const inputRef = useRef(null);
  const [dentro, setDentro] = useState(false);

  const tomar = (archivo) => { if (archivo) onChange(archivo); };
  const peso = (b) => b < 1024 * 1024
    ? `${Math.max(1, Math.round(b / 1024))} KB`
    : `${(b / 1024 / 1024).toFixed(1)} MB`;

  if (value) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
        border: "1.5px solid var(--earth)", background: "rgba(53,94,59,.06)", borderRadius: 11,
      }}>
        <HiOutlinePaperClip style={{ fontSize: "1.1rem", color: "var(--earth)", flexShrink: 0 }} />
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: ".82rem", fontWeight: 600, overflow: "hidden",
                         textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value.name}</span>
          <span style={{ fontSize: ".72rem", color: "var(--mu)" }}>{peso(value.size)}</span>
        </span>
        <button type="button" onClick={() => { onChange(null); if (inputRef.current) inputRef.current.value = ""; }}
          aria-label="Quitar archivo"
          style={{ border: "none", background: "transparent", cursor: "pointer",
                   color: "var(--mu)", fontSize: "1.1rem", lineHeight: 1, padding: 4 }}>
          <HiOutlineXMark />
        </button>
        <input ref={inputRef} type="file" accept={accept} style={{ display: "none" }}
          onChange={e => tomar(e.target.files?.[0])} />
      </div>
    );
  }

  return (
    <label
      onDragOver={e => { e.preventDefault(); setDentro(true); }}
      onDragLeave={() => setDentro(false)}
      onDrop={e => { e.preventDefault(); setDentro(false); tomar(e.dataTransfer.files?.[0]); }}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
        padding: "16px 12px", cursor: "pointer", textAlign: "center",
        border: `1.5px dashed ${dentro ? "var(--earth)" : "rgba(67,69,63,.22)"}`,
        background: dentro ? "rgba(53,94,59,.06)" : "var(--sf2)",
        borderRadius: 11, transition: "border-color .12s, background .12s",
      }}>
      <HiOutlineArrowUpTray style={{ fontSize: "1.25rem", color: "var(--mu)" }} />
      <span style={{ fontSize: ".82rem", fontWeight: 600 }}>Elegir archivo o arrastrarlo aquí</span>
      {hint && <span style={{ fontSize: ".72rem", color: "var(--mu)", lineHeight: 1.4 }}>{hint}</span>}
      <input ref={inputRef} type="file" accept={accept} style={{ display: "none" }}
        onChange={e => tomar(e.target.files?.[0])} />
    </label>
  );
}
