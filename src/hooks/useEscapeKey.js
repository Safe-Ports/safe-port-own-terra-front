import { useEffect, useRef } from "react";

const escapeStack = [];

/**
 * Cierra únicamente la capa interactiva que se abrió más recientemente.
 * Evita que Escape cierre dos modales apilados en la misma pulsación.
 */
export default function useEscapeKey(onEscape, enabled = true) {
  const callbackRef = useRef(onEscape);
  callbackRef.current = onEscape;

  useEffect(() => {
    if (!enabled) return undefined;

    const layer = { close: () => callbackRef.current?.() };
    escapeStack.push(layer);

    const handleKeyDown = (event) => {
      if (
        event.key !== "Escape"
        || event.defaultPrevented
        || event.isComposing
        || escapeStack.at(-1) !== layer
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      layer.close();
    };

    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      const index = escapeStack.lastIndexOf(layer);
      if (index >= 0) escapeStack.splice(index, 1);
    };
  }, [enabled]);
}
