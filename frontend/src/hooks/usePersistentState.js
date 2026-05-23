import { useEffect, useState } from "react";

export function usePersistentState(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored !== null) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error(`No se pudo leer ${key} desde localStorage`, error);
    }

    return typeof initialValue === "function" ? initialValue() : initialValue;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`No se pudo guardar ${key} en localStorage`, error);
    }
  }, [key, value]);

  return [value, setValue];
}
