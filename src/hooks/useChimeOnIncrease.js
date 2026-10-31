import { useEffect, useRef } from "react";
import { playNotification } from "@/utils/sounds";

/**
 * Suena el aviso cuando `count` sube respecto a la lectura anterior. La primera
 * lectura solo fija la base: abrir la app con 5 pendientes no debe sonar, sí que
 * llegue el sexto mientras la usas.
 */
export default function useChimeOnIncrease(count) {
  const previous = useRef(null);
  useEffect(() => {
    if (typeof count !== "number") return;
    if (previous.current !== null && count > previous.current) playNotification();
    previous.current = count;
  }, [count]);
}
