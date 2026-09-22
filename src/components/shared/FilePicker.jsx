import { useRef, useState } from "react";
import { HiOutlinePaperClip, HiOutlineXMark, HiOutlineArrowUpTray } from "react-icons/hi2";

/* Selector de archivo: el input nativo se ve de otra época y no dice nada del
   archivo elegido. Este muestra nombre y peso, y deja quitarlo sin reabrir el
   explorador. El input real queda oculto pero accesible por teclado.

   Con `multiple` el contrato cambia de un archivo a una lista: `value` es un
   arreglo y `onChange` recibe un arreglo. Sin la prop se comporta igual que
   siempre, así que las pantallas que ya lo usaban no se enteran. */
export default function FilePicker({ value, onChange, accept, hint, multiple = false }) {
  const inputRef = useRef(null);
  const [dentro, setDentro] = useState(false);

  const lista = multiple ? (value || []) : (value ? [value] : []);

  const peso = (b) => b < 1024 * 1024
    ? `${Math.max(1, Math.round(b / 1024))} KB`
    : `${(b / 1024 / 1024).toFixed(1)} MB`;

  const limpiarInput = () => { if (inputRef.current) inputRef.current.value = ""; };

  const tomar = (archivos) => {
    const nuevos = Array.from(archivos || []).filter(Boolean);
    if (nuevos.length === 0) return;
    if (multiple) onChange([...lista, ...nuevos]);
    else onChange(nuevos[0]);
    // El input conserva su selección anterior: sin esto, volver a elegir el
    // mismo archivo no dispara change y parece que no pasó nada.
    limpiarInput();
  };

  const quitar = (i) => {
    if (multiple) onChange(lista.filter((_, j) => j !== i));
    else onChange(null);
    limpiarInput();
  };

  const input = (
    <input ref={inputRef} type="file" accept={accept} multiple={multiple}
      style={{ display: "none" }}
      onChange={e => tomar(e.target.files)} />
  );

  const fila = (archivo, i) => (
    <div key={`${archivo.name}-${i}`} style={{
      display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
      border: "1.5px solid var(--earth)", background: "rgba(53,94,59,.06)", borderRadius: 11,
    }}>
      <HiOutlinePaperClip style={{ fontSize: "1.1rem", color: "var(--earth)", flexShrink: 0 }} />
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <span style={{ fontSize: ".82rem", fontWeight: 600, overflow: "hidden",
                       textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{archivo.name}</span>
        <span style={{ fontSize: ".72rem", color: "var(--mu)" }}>{peso(archivo.size)}</span>
      </span>
      <button type="button" onClick={() => quitar(i)}
        aria-label={`Quitar ${archivo.name}`}
        style={{ border: "none", background: "transparent", cursor: "pointer",
                 color: "var(--mu)", fontSize: "1.1rem", lineHeight: 1, padding: 4 }}>
        <HiOutlineXMark />
      </button>
    </div>
  );

  // Con un solo archivo la zona de arrastre desaparece: ya cumplió. Con varios
  // se queda, porque agregar el siguiente es lo más probable que siga.
  if (lista.length > 0 && !multiple) {
    return <div>{fila(lista[0], 0)}{input}</div>;
  }

  const zona = (
    <label
      onDragOver={e => { e.preventDefault(); setDentro(true); }}
      onDragLeave={() => setDentro(false)}
      onDrop={e => { e.preventDefault(); setDentro(false); tomar(e.dataTransfer.files); }}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
        padding: "16px 12px", cursor: "pointer", textAlign: "center",
        border: `1.5px dashed ${dentro ? "var(--earth)" : "rgba(67,69,63,.22)"}`,
        background: dentro ? "rgba(53,94,59,.06)" : "var(--sf2)",
        borderRadius: 11, transition: "border-color .12s, background .12s",
      }}>
      <HiOutlineArrowUpTray style={{ fontSize: "1.25rem", color: "var(--mu)" }} />
      <span style={{ fontSize: ".82rem", fontWeight: 600 }}>
        {multiple && lista.length > 0
          ? "Agregar otro archivo o arrastrarlo aquí"
          : `Elegir archivo${multiple ? "s" : ""} o arrastrarlo aquí`}
      </span>
      {hint && <span style={{ fontSize: ".72rem", color: "var(--mu)", lineHeight: 1.4 }}>{hint}</span>}
      {input}
    </label>
  );

  if (!multiple) return zona;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {lista.map(fila)}
      {zona}
    </div>
  );
}
