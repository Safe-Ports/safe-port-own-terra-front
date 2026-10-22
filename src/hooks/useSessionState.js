import { useCallback, useEffect, useRef, useState } from "react";
import { readSessionTokens } from "@/services/api";

const SESSION_KEY = "lm_session";

/**
 * Estado de la sesión: el perfil lo maneja React, los tokens los manda `api.js`.
 *
 * La sesión vive en una sola clave de localStorage y tiene dos escritores. El
 * interceptor de `api.js` escribe ahí cada vez que renueva el token, sin pasar
 * por React. Si además React persistiera su copia tal cual, cualquier cambio de
 * perfil posterior a una renovación —terminar un tutorial, subir un avatar—
 * devolvería a localStorage el token viejo que quedó congelado en su estado.
 *
 * Y ese token viejo no es solo un token vencido: el backend ROTA el refresh al
 * renovarlo y da de baja el `sid` anterior, así que el refresh que vuelve a
 * escribirse ya no sirve para nada. El siguiente 401 no se puede recuperar y la
 * app manda al usuario a la pantalla de acceso, en mitad de lo que estuviera
 * cargando. Como la renovación ocurre cada hora de uso continuo, reaparecía
 * durante toda la jornada.
 *
 * Acá se corta: al persistir, los tokens se releen de localStorage —que es donde
 * `api.js` dejó los vigentes— en vez de tomarse del estado de React.
 *
 * @param {object|null} initialValue Valor si no hay nada guardado.
 * @returns {[object|null, Function]} El par estado/actualizador de siempre.
 */
export function useSessionState(initialValue = null) {
  const [value, setValue] = useState(() => {
    try {
      const stored = window.localStorage.getItem(SESSION_KEY);
      if (stored !== null) return JSON.parse(stored);
    } catch (error) {
      console.error("No se pudo leer la sesión desde localStorage", error);
    }
    return initialValue;
  });

  // Evita reescribir en el primer render: lo guardado ya está guardado, y
  // volver a escribirlo solo abre una ventana para pisar tokens sin necesidad.
  const yaMontado = useRef(false);

  useEffect(() => {
    if (!yaMontado.current) {
      yaMontado.current = true;
      return;
    }
    try {
      if (value === null) {
        window.localStorage.removeItem(SESSION_KEY);
        return;
      }
      // Los tokens NO salen de `value`: salen de donde los dejó `api.js`.
      const vigentes = readSessionTokens();
      window.localStorage.setItem(
        SESSION_KEY,
        JSON.stringify(vigentes ? { ...value, ...vigentes } : value)
      );
    } catch (error) {
      console.error("No se pudo guardar la sesión en localStorage", error);
    }
  }, [value]);

  // Mantiene la identidad estable para que no invalide memos aguas abajo.
  const set = useCallback((next) => setValue(next), []);

  return [value, set];
}
