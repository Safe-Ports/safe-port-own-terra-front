import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, beforeEach, vi } from "vitest";

const SESSION_KEY = "lm_session";

// El módulo real lee y escribe la misma clave de localStorage; el mock hace lo
// mismo para poder simular lo que hace el interceptor a espaldas de React.
vi.mock("@/services/api", () => ({
  default: {},
  readSessionTokens: () => {
    const s = JSON.parse(window.localStorage.getItem("lm_session") || "null");
    return s?.token ? { token: s.token, refresh_token: s.refresh_token } : null;
  },
}));

import { useSessionState } from "./useSessionState";

const leerSesion = () => JSON.parse(window.localStorage.getItem(SESSION_KEY) || "null");

/** Lo que hace el interceptor de api.js al renovar: escribe directo, sin React. */
function renovarTokenPorFuera() {
  const s = leerSesion();
  window.localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ ...s, token: "access-NUEVO", refresh_token: "refresh-NUEVO" })
  );
}

describe("useSessionState: los tokens los manda api.js, no React", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        token: "access-VIEJO",
        refresh_token: "refresh-VIEJO",
        name: "Ana",
        tours_seen: [],
      })
    );
  });

  it("un cambio de perfil posterior a una renovación NO devuelve el token viejo", () => {
    // Este es el bug que echaba al usuario: React se queda con el token con el que
    // arrancó, el interceptor renueva por su cuenta, y el siguiente cambio de
    // perfil —terminar un tutorial, subir un avatar— reescribía la sesión entera
    // desde el estado viejo de React. Como el backend ROTA el refresh al renovar
    // y da de baja el `sid` anterior, el par reescrito ya no servía para nada:
    // el siguiente 401 no se podía recuperar y la app mandaba a iniciar sesión.
    const { result } = renderHook(() => useSessionState(null));

    expect(result.current[0].token).toBe("access-VIEJO");

    renovarTokenPorFuera();

    act(() => {
      const set = result.current[1];
      set((prev) => ({ ...prev, tours_seen: ["ecosistema"] }));
    });

    const guardada = leerSesion();
    expect(guardada.token).toBe("access-NUEVO");
    expect(guardada.refresh_token).toBe("refresh-NUEVO");
    // Y el cambio de perfil sí se guardó.
    expect(guardada.tours_seen).toEqual(["ecosistema"]);
  });

  it("persiste los cambios de perfil cuando no hubo renovación", () => {
    const { result } = renderHook(() => useSessionState(null));

    act(() => {
      result.current[1]((prev) => ({ ...prev, name: "Ana María" }));
    });

    const guardada = leerSesion();
    expect(guardada.name).toBe("Ana María");
    expect(guardada.token).toBe("access-VIEJO");
  });

  it("cerrar sesión borra la clave entera", () => {
    const { result } = renderHook(() => useSessionState(null));

    act(() => {
      result.current[1](null);
    });

    expect(window.localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it("no reescribe nada en el primer render", () => {
    // Volver a escribir lo que ya estaba solo abre una ventana para pisar tokens.
    renovarTokenPorFuera();
    renderHook(() => useSessionState(null));
    expect(leerSesion().token).toBe("access-NUEVO");
  });
});
