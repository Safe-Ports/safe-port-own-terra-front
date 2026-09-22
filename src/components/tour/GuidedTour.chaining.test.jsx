import { MemoryRouter } from "react-router-dom";
import { render, screen, waitFor, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// Mockeamos react-joyride en vez de renderizarlo de verdad: jsdom no mide posiciones
// de elementos (getBoundingClientRect siempre da 0), así que Joyride nunca completa
// su ciclo de "target found" con anclas reales de la app. Lo que hay que probar aquí
// es NUESTRO cableado (encadenado explícito vía `next`, remontaje entre tours,
// manejo de ancla ausente), no el motor de posicionamiento de la librería.
const { onEventRef, lastPropsRef, mountLog, titleLog } = vi.hoisted(() => ({
  onEventRef: { current: null },
  lastPropsRef: { current: null },
  // Registra cada MONTAJE real del componente (no cada actualización de props).
  // Sirve para detectar el bug de "misma instancia reutilizada entre tours
  // distintos": sin `key={tour.key}` en el GuidedTour real, React reutiliza el
  // componente y esto NO se incrementaría al cambiar de tour.
  mountLog: [],
  // Igual que mountLog pero por título del primer paso: varios tours comparten
  // target "body" (los pasos puramente informativos), así que el target NO basta
  // para saber CUÁL tour montó — el título sí es único por tour.
  titleLog: [],
}));

vi.mock("react-joyride", async () => {
  const { useEffect } = await import("react");
  return {
    Joyride: (props) => {
      useEffect(() => {
        mountLog.push(props.steps?.[0]?.target);
        titleLog.push(props.steps?.[0]?.title);
      }, []); // deps vacío a propósito: solo debe correr una vez POR INSTANCIA montada.
      onEventRef.current = props.onEvent;
      lastPropsRef.current = props;
      return <div data-testid="joyride-mock" data-run={String(props.run)} />;
    },
    ACTIONS: { CLOSE: "close", SKIP: "skip" },
    EVENTS: { TARGET_NOT_FOUND: "error:target_not_found" },
    STATUS: { FINISHED: "finished", SKIPPED: "skipped" },
  };
});

const markTourSeen = vi.fn();
let ctx;
vi.mock("@/context/AppContext", () => ({
  useAppContext: () => ctx,
}));

// Import dinámico DESPUÉS de los mocks (vi.mock ya queda hoisted por Vitest, así
// que un import normal también funcionaría, pero se deja explícito el orden).
import GuidedTour, { replayTour } from "./GuidedTour.jsx";

function renderTour() {
  return render(
    <MemoryRouter>
      <GuidedTour />
    </MemoryRouter>
  );
}

/** Simula que Joyride reporta que el tour actual terminó/se saltó/se cerró. */
function finish(status = "finished", action = "next") {
  act(() => onEventRef.current({ status, action, type: "tour:end" }));
}

describe("Tutorial guiado: encadenado explícito vía `next`", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    markTourSeen.mockClear();
    onEventRef.current = null;
    lastPropsRef.current = null;
    mountLog.length = 0;
    titleLog.length = 0;
    ctx = { currentUser: { id: "u1", tours_seen: [] }, markTourSeen };
  });

  afterEach(() => vi.useRealTimers());

  it("nada arranca solo: se necesita un replayTour explícito", async () => {
    renderTour();
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.queryByTestId("joyride-mock")).not.toBeInTheDocument();
  });

  it("al COMPLETAR un tour con `next` sin waitFor, encadena casi de inmediato", async () => {
    renderTour();
    act(() => replayTour("lands-frac-selector"));
    await waitFor(() => expect(lastPropsRef.current).not.toBeNull());

    finish("finished", "next");
    // lands-frac-inicio tiene waitFor: sin su ancla montada, NO debe arrancar solo.
    act(() => vi.advanceTimersByTime(2000));
    expect(titleLog).not.toContain("Tu primer fraccionamiento");
  });

  it("la continuación con waitFor espera a que su ancla exista, y entonces arranca", async () => {
    renderTour();
    act(() => replayTour("lands-frac-selector"));
    await waitFor(() => expect(lastPropsRef.current).not.toBeNull());
    finish("finished", "next");

    const el = document.createElement("div");
    el.setAttribute("data-tour", "frac-inicio");
    document.body.appendChild(el);

    act(() => vi.advanceTimersByTime(700));
    await waitFor(() => expect(titleLog).toContain("Tu primer fraccionamiento"));
    el.remove();
  });

  it("SALTAR el tour NO dispara su continuación (el usuario dijo que no quiere seguir)", async () => {
    renderTour();
    act(() => replayTour("lands-frac-selector"));
    await waitFor(() => expect(lastPropsRef.current).not.toBeNull());

    finish("skipped", "skip");
    expect(markTourSeen).toHaveBeenCalledWith("lands-frac-selector");

    const el = document.createElement("div");
    el.setAttribute("data-tour", "frac-inicio");
    document.body.appendChild(el);
    act(() => vi.advanceTimersByTime(2000));
    expect(titleLog).not.toContain("Tu primer fraccionamiento");
    el.remove();
  });

  it("CERRAR con la × tampoco dispara la continuación", async () => {
    renderTour();
    act(() => replayTour("lands-frac-selector"));
    await waitFor(() => expect(lastPropsRef.current).not.toBeNull());

    finish(null, "close"); // null, no undefined: un default param solo evita undefined
    expect(markTourSeen).toHaveBeenCalledWith("lands-frac-selector");

    const el = document.createElement("div");
    el.setAttribute("data-tour", "frac-inicio");
    document.body.appendChild(el);
    act(() => vi.advanceTimersByTime(2000));
    expect(titleLog).not.toContain("Tu primer fraccionamiento");
    el.remove();
  });

  it("el tour de Reportes espera a que se elija un cliente antes de continuar", async () => {
    renderTour();
    act(() => replayTour("reportes-clientes"));
    await waitFor(() => expect(lastPropsRef.current).not.toBeNull());
    finish("finished");

    // Sin cliente elegido, rp-comportamiento no existe: no debe arrancar solo.
    act(() => vi.advanceTimersByTime(2000));
    expect(titleLog).not.toContain("Comportamiento de pago");

    const el = document.createElement("div");
    el.setAttribute("data-tour", "rp-comportamiento");
    document.body.appendChild(el);
    act(() => vi.advanceTimersByTime(700));
    await waitFor(() => expect(titleLog).toContain("Comportamiento de pago"));
    el.remove();
  });

  it("recorre la cadena completa de 4 partes, una vez arrancada a mano", async () => {
    renderTour();
    act(() => replayTour("lands-frac-selector"));
    await waitFor(() => expect(lastPropsRef.current).not.toBeNull());
    finish("finished");

    const inicio = document.createElement("div");
    inicio.setAttribute("data-tour", "frac-inicio");
    document.body.appendChild(inicio);
    act(() => vi.advanceTimersByTime(700));
    await waitFor(() => expect(titleLog).toContain("Tu primer fraccionamiento"));
    finish("finished");

    const guardar = document.createElement("div");
    guardar.setAttribute("data-tour", "frac-guardar");
    document.body.appendChild(guardar);
    act(() => vi.advanceTimersByTime(700));
    await waitFor(() => expect(titleLog).toContain("Ya casi"));
    finish("finished");

    const matriz = document.createElement("div");
    matriz.setAttribute("data-tour", "frac-matriz");
    document.body.appendChild(matriz);
    act(() => vi.advanceTimersByTime(700));
    await waitFor(() => expect(titleLog).toContain("Ahí están tus lotes"));
    finish("finished"); // lands-frac-matriz no tiene `next`: la cadena termina sola aquí.

    expect(markTourSeen.mock.calls.map((c) => c[0])).toEqual([
      "lands-frac-selector",
      "lands-frac-inicio",
      "lands-frac-tablero",
      "lands-frac-matriz",
    ]);
    inicio.remove();
    guardar.remove();
    matriz.remove();
  });

  it("remonta Joyride limpio al pasar de un tour a otro (no arrastra estado interno)", async () => {
    // Regresión: sin `key={tour.key}` en el GuidedTour real, React reutiliza la MISMA
    // instancia de <Joyride> al cambiar de tour. El estado interno de Joyride (en
    // qué paso va) sobrevive a ese cambio de props, y con un array de pasos nuevo
    // eso deja el tour "trabado". Esta prueba exige un MONTAJE real por tour.
    renderTour();
    act(() => replayTour("ecosistema"));
    await waitFor(() => expect(mountLog.length).toBe(1));
    finish("finished");
    expect(markTourSeen).toHaveBeenCalledWith("ecosistema");

    act(() => replayTour("restricciones"));
    await waitFor(() => expect(mountLog.length).toBe(2));
  });

  it("si Joyride reporta que el objetivo no existe, se cierra y se marca visto", async () => {
    // Cubre el caso de una ancla que desapareció (rol sin acceso, rediseño).
    renderTour();
    act(() => replayTour("ecosistema"));
    await waitFor(() => expect(lastPropsRef.current).not.toBeNull());

    act(() => onEventRef.current({ type: "error:target_not_found" }));
    expect(markTourSeen).toHaveBeenCalledWith("ecosistema");
  });

  it("perder el ancla TAMBIÉN encadena a `next` (regresión: antes cortaba la cadena)", async () => {
    // Caso real: el usuario sube el plano más rápido de lo que avanza el tour de
    // "nombre y plano" — eso cambia la pantalla a la del tablero bajo sus pies, y el
    // ancla del paso en curso (frac-plano) desaparece a mitad de camino. Antes, el
    // manejo de TARGET_NOT_FOUND tenía un `return` que saltaba la lógica de abajo:
    // el tour se cerraba, pero jamás arrancaba el siguiente — el usuario se quedaba
    // con la sobrecapa oscura sin nada encima, "bloqueado".
    renderTour();
    act(() => replayTour("lands-frac-inicio"));
    await waitFor(() => expect(lastPropsRef.current).not.toBeNull());

    act(() => onEventRef.current({ type: "error:target_not_found" }));
    expect(markTourSeen).toHaveBeenCalledWith("lands-frac-inicio");

    // El tablero ya está montado (el usuario ya subió el plano) — no debería hacer
    // falta esperar nada.
    const guardar = document.createElement("div");
    guardar.setAttribute("data-tour", "frac-guardar");
    document.body.appendChild(guardar);
    act(() => vi.advanceTimersByTime(700));
    await waitFor(() => expect(titleLog).toContain("Ya casi"));
    guardar.remove();
  });

  it("se puede relanzar Restricciones (sin ruta ni next) directo, sin nada raro", async () => {
    renderTour();
    act(() => replayTour("restricciones"));
    await waitFor(() => expect(titleLog).toContain("Cosas que a veces confunden"));
    finish("finished");
    expect(markTourSeen).toHaveBeenCalledWith("restricciones");
  });

  it("encadena aunque Joyride NUNCA avise que terminó (botón tapado por un modal, no removido)", async () => {
    // El bug real reportado: "+ Generar Contrato" abre un modal ENCIMA del botón sin
    // quitarlo del DOM — sigue ahí, solo tapado. Para Joyride eso no siempre cuenta
    // como "el objetivo se perdió" (a diferencia de un elemento que sí se desmonta,
    // como en el flujo de Lots), así que ni el status pasa a "finished" ni llega
    // TARGET_NOT_FOUND: el mock de Joyride se queda completamente callado, tal como
    // pasaría en la app real. Si el encadenado dependiera de que Joyride avisara
    // algo, esto se quedaría trabado para siempre. No debe depender de eso.
    renderTour();
    act(() => replayTour("contrato-boton"));
    await waitFor(() => expect(titleLog).toContain("Genera tu primer contrato"));

    // El usuario le dio clic al botón real: el modal se abrió y esta ancla ya existe
    // en el DOM, aunque el botón original siga ahí tapado debajo.
    const el = document.createElement("div");
    el.setAttribute("data-tour", "contrato-frac-lote");
    document.body.appendChild(el);

    act(() => vi.advanceTimersByTime(700));
    await waitFor(() => expect(titleLog).toContain("Elige el fraccionamiento y el lote"));
    expect(markTourSeen).toHaveBeenCalledWith("contrato-boton");
    el.remove();
  });

  it("el tour del formulario de contrato pide un zIndex por encima del modal que señala", async () => {
    // El modal compartido de la app (Modal.jsx / .modal-overlay) usa z-index 60. El
    // resto de los tours corre a 45 A PROPÓSITO — por debajo de cualquier modal — para
    // que un modal AJENO al tour que se abra sin querer gane y quede usable encima.
    // Pero las anclas de este tour viven DENTRO del modal de Generar Contrato: si se
    // quedara en 45, quedaría tapado por el modal que se supone que está señalando,
    // y el usuario vería el formulario sin ninguna indicación encima.
    renderTour();
    act(() => replayTour("lands-frac-selector"));
    await waitFor(() => expect(lastPropsRef.current).not.toBeNull());
    expect(lastPropsRef.current.options.zIndex).toBe(45);

    act(() => replayTour("contrato-form"));
    await waitFor(() => expect(titleLog).toContain("Elige el fraccionamiento y el lote"));
    expect(lastPropsRef.current.options.zIndex).toBeGreaterThan(60);
  });
});
