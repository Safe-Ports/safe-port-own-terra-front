import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HiOutlinePaperClip, HiChevronDown } from "react-icons/hi2";

/**
 * Una lista de archivos detrás de un desplegable.
 *
 * En lista abierta la celda crece con cada archivo: un lote con diez estiraba su
 * fila y rompía la lectura de la tabla. Acá la celda siempre ocupa un renglón y
 * el detalle se pide.
 *
 * El panel va en un portal con posición fija porque estas tablas viven dentro de
 * contenedores con scroll, que recortarían cualquier panel posicionado dentro.
 * Por lo mismo se cierra al hacer scroll —seguir a la celda mientras se desplaza
 * costaría más de lo que vale.
 *
 * @param {Array} archivos Objetos con id, name y download_url.
 * @param {string} titulo Encabezado del panel (p. ej. el lote al que pertenecen).
 * @param {string} [vacio] Qué mostrar si no hay archivos.
 */
export default function FilesDropdown({ archivos, titulo, vacio = "—" }) {
  const [abierto, setAbierto] = useState(false);
  const [pos, setPos] = useState(null);
  const botonRef = useRef(null);
  const panelRef = useRef(null);

  const cantidad = archivos?.length || 0;

  useEffect(() => {
    if (!abierto) return undefined;

    const cerrar = () => setAbierto(false);
    const alClic = (e) => {
      if (botonRef.current?.contains(e.target)) return;
      if (panelRef.current?.contains(e.target)) return;
      setAbierto(false);
    };
    const alTeclado = (e) => { if (e.key === "Escape") { setAbierto(false); botonRef.current?.focus(); } };

    document.addEventListener("mousedown", alClic);
    document.addEventListener("keydown", alTeclado);
    // En captura: el scroll de un contenedor interno no burbujea.
    window.addEventListener("scroll", cerrar, true);
    window.addEventListener("resize", cerrar);
    return () => {
      document.removeEventListener("mousedown", alClic);
      document.removeEventListener("keydown", alTeclado);
      window.removeEventListener("scroll", cerrar, true);
      window.removeEventListener("resize", cerrar);
    };
  }, [abierto]);

  if (cantidad === 0) return <span className="mx-files-empty">{vacio}</span>;

  const alternar = () => {
    if (abierto) { setAbierto(false); return; }
    const r = botonRef.current.getBoundingClientRect();
    const ancho = 260;
    setPos({
      top: r.bottom + 6,
      // Si la celda está pegada al borde derecho, el panel se alinea hacia
      // adentro en vez de salirse de la pantalla.
      left: Math.max(8, Math.min(r.left, window.innerWidth - ancho - 8)),
      ancho,
    });
    setAbierto(true);
  };

  return (
    <>
      <button
        ref={botonRef}
        type="button"
        className="mx-files-btn"
        onClick={alternar}
        aria-expanded={abierto}
        aria-haspopup="true"
      >
        <HiOutlinePaperClip aria-hidden="true" />
        {cantidad} archivo{cantidad === 1 ? "" : "s"}
        <HiChevronDown aria-hidden="true" className={abierto ? "mx-files-caret abierto" : "mx-files-caret"} />
      </button>

      {abierto && pos && createPortal(
        <div
          ref={panelRef}
          className="mx-files-pop"
          role="dialog"
          aria-label={`Archivos · ${titulo}`}
          style={{ top: pos.top, left: pos.left, width: pos.ancho }}
        >
          <div className="mx-files-pop-h">{titulo}</div>
          {archivos.map((a) => (
            <a key={a.id} href={a.download_url} target="_blank" rel="noreferrer"
               className="mx-files-item" title={a.name}>
              <HiOutlinePaperClip aria-hidden="true" />
              <span>{a.name}</span>
            </a>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}
