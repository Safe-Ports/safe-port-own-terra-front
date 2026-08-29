import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
// react-joyride 3.x: `Joyride` es export con nombre (en la 2.x era default), la
// configuración global vive en `options` y el callback se llama `onEvent`. Casi toda
// la documentación que circula es de la 2.x y no aplica aquí.
import { Joyride, ACTIONS, EVENTS, STATUS } from "react-joyride";
import { useAppContext } from "@/context/AppContext";
import { TOURS } from "@/tours/definitions";

// Única excepción a "nada se auto-lanza": la bienvenida. Sin ella, un usuario nuevo
// no tiene forma de enterarse de que existe el botón ❓ Guías — nada se lo dice. Se
// dispara UNA vez, hardcodeada a este tour y ruta específicos (no es un mecanismo
// genérico): así queda imposible que un tour futuro herede auto-lanzamiento sin
// haberlo pedido explícitamente aquí.
const WELCOME_KEY = "ecosistema";
const WELCOME_ROUTE = "/ecosistema";

// Paleta del sistema de diseño (ecosystem.css). Se repite aquí porque Joyride pinta
// en un portal con estilos en línea y no lee las variables CSS del shell.
const COLORS = {
  deep: "#1E3D2B",
  mid: "#355E3B",
  surface: "#FFFFFF",
  text: "#3B3A34",
  muted: "#83867C",
};

/**
 * Tutorial guiado: oscurece la pantalla, ilumina el elemento del que habla y explica
 * qué es, paso a paso sobre la interfaz real.
 *
 * Nada se auto-lanza por visitar una pantalla, SALVO la bienvenida (ver
 * WELCOME_KEY/WELCOME_ROUTE arriba) — el resto, el usuario decide cuándo empezarlo
 * desde el panel de Tours guiados (dentro de ❓ Guías). Un tour puede tener una
 * continuación (`next`, para flujos de varios pasos como "crear tu primer
 * fraccionamiento"): esa continuación SOLO se dispara si el tour anterior se
 * completó — nunca por su cuenta, nunca por visitar su pantalla directamente.
 */
function GuidedTour() {
  const { pathname } = useLocation();
  const { currentUser, markTourSeen, authHydrating } = useAppContext();
  const [running, setRunning] = useState(false);
  const [tour, setTour] = useState(null);
  // true si el usuario dijo explícitamente "no sigas" (Saltar/Cerrar) sobre el tour
  // ACTUAL. Un ref, no state: se lee dentro de un `setInterval` sin necesitar
  // volver a renderizar cuando cambia. Se resetea a false cada vez que arranca un
  // tour nuevo (start()).
  const chainCancelledRef = useRef(false);
  // Qué tours ya se avisaron al servidor en ESTA sesión. Necesario porque ahora hay
  // DOS caminos que pueden marcar el mismo tour como visto (el evento de Joyride, y
  // el vigía proactivo de abajo que no depende de él) — sin este control, un mismo
  // tour se marcaría dos veces seguidas.
  const markedSeenRef = useRef(new Set());
  const markSeenOnce = (key) => {
    if (markedSeenRef.current.has(key)) return;
    markedSeenRef.current.add(key);
    markTourSeen(key);
  };

  const start = (t) => {
    chainCancelledRef.current = false;
    setTour(t);
    setRunning(true);
  };

  // La bienvenida: única auto-lanzada, una sola vez, solo en /ecosistema. No lleva
  // `next` en tours/definitions.js (así que no encadena a nada) — su último paso ya
  // señala ❓ Guías, y de ahí en más el usuario elige.
  useEffect(() => {
    if (authHydrating || !currentUser) return undefined;
    if (pathname !== WELCOME_ROUTE) return undefined;
    if ((currentUser.tours_seen || []).includes(WELCOME_KEY)) return undefined;

    const welcome = TOURS.find((t) => t.key === WELCOME_KEY);
    if (!welcome) return undefined;

    // Un respiro para que la pantalla termine de pintar: Joyride mide la posición
    // de los elementos al arrancar, y con datos aún cargando mediría el sitio
    // equivocado.
    const timer = setTimeout(() => start(welcome), 700);
    return () => clearTimeout(timer);
  }, [pathname, currentUser, authHydrating]);

  // Arranca manualmente (botón "Iniciar"/"Repetir" del panel de Tours guiados).
  useEffect(() => {
    const onReplay = (e) => {
      const found = TOURS.find((t) => t.key === e.detail?.key);
      if (found) start(found);
    };
    window.addEventListener("ownterra:replay-tour", onReplay);
    return () => window.removeEventListener("ownterra:replay-tour", onReplay);
  }, []);

  // Vigila PROACTIVAMENTE si la continuación (`next`) del tour actual ya está
  // lista — sin esperar a que Joyride avise que el paso actual "terminó".
  //
  // Por qué: cuando un paso invita a abrir un modal (p. ej. "+ Generar Contrato"),
  // el botón que se estaba señalando NO desaparece del DOM al abrirse el modal —
  // queda TAPADO por él. Joyride no siempre nota esa diferencia (para su detección
  // de "el objetivo se perdió", un elemento cubierto por otro no es lo mismo que
  // un elemento removido), así que el tour se queda mudo detrás del modal, sin
  // avisar nunca de que "terminó". Por eso ya no dependemos de sus eventos para
  // encadenar: comprobamos nosotros mismos, por nuestra cuenta, si la ancla de la
  // SIGUIENTE parte ya existe, y en cuanto lo esté, saltamos para allá — sin
  // importar si Joyride se dio cuenta de nada.
  //
  // Se detiene si el usuario dijo explícitamente que no quiere seguir (Saltar o
  // Cerrar el tour actual): eso NO debe arrastrarlo a la siguiente parte.
  useEffect(() => {
    if (!tour?.next) return undefined;
    const nextTour = TOURS.find((t) => t.key === tour.next);
    if (!nextTour) return undefined;

    const ready = () => !nextTour.waitFor || document.querySelector(nextTour.waitFor);
    const advance = () => {
      markSeenOnce(tour.key);
      start(nextTour);
    };

    if (chainCancelledRef.current) return undefined;
    if (ready()) {
      advance();
      return undefined;
    }

    const poll = setInterval(() => {
      if (chainCancelledRef.current) {
        clearInterval(poll);
        return;
      }
      if (ready()) {
        clearInterval(poll);
        advance();
      }
    }, 600);
    return () => clearInterval(poll);
  }, [tour]);

  if (!tour) return null;

  const handleEvent = ({ action, status, type }) => {
    // Ancla ausente (rol sin acceso, rediseño que borró el data-tour, o el caso más
    // común: el usuario ya hizo la acción y la pantalla cambió bajo sus pies) — o
    // terminarlo, saltarlo, cerrarlo: en todos los casos hay que apagar ESTE
    // Joyride. `close` cubre la ×, la tecla Esc y el clic en el fondo, que no
    // cambian el `status`.
    const targetMissing = type === EVENTS.TARGET_NOT_FOUND;
    const done =
      targetMissing ||
      [STATUS.FINISHED, STATUS.SKIPPED].includes(status) ||
      [ACTIONS.CLOSE, ACTIONS.SKIP].includes(action);
    if (!done) return;

    // Solo Saltar/Cerrar cuentan como "el usuario dijo que no quiere seguir": el
    // efecto de arriba, que vigila la continuación, respeta esta bandera y deja de
    // insistir. Terminar normalmente o perder el ancla NO cancelan la cadena — el
    // efecto de arriba sigue vigilando por su cuenta (ver el comentario ahí).
    if ([STATUS.SKIPPED].includes(status) || [ACTIONS.CLOSE, ACTIONS.SKIP].includes(action)) {
      chainCancelledRef.current = true;
    }

    setRunning(false);
    markSeenOnce(tour.key);
  };

  return (
    <Joyride
      // Fuerza un montaje nuevo por cada tour: sin esto, React reutiliza la MISMA
      // instancia al pasar de un tour a otro (p. ej. selector -> inicio -> tablero),
      // y el estado interno de Joyride (en qué paso va) sobrevive al cambio de
      // `steps`. El síntoma es exactamente "se traba": la sobrecapa oscura sigue
      // ahí, pero el globo nunca aparece porque el estado interno quedó desfasado
      // respecto al tour nuevo.
      key={tour.key}
      steps={tour.steps}
      run={running}
      continuous
      onEvent={handleEvent}
      locale={{
        back: "Atrás",
        close: "Cerrar",
        last: "Empezar",
        next: "Siguiente",
        // "next" NO cubre el botón cuando hay barra de progreso (showProgress:true):
        // esa variante usa esta clave separada, con sus propios placeholders. Sin
        // traducirla, cualquier paso intermedio mostraba "Next (2 of 3)" en inglés.
        nextWithProgress: "Siguiente ({current} de {total})",
        open: "Abrir el diálogo",
        skip: "Saltar",
      }}
      options={{
        // El default de la 3.x no incluye "skip": sin esto no habría forma de
        // saltarse el tutorial salvo cerrándolo.
        buttons: ["back", "close", "primary", "skip"],
        // Sin esto, el PRIMER paso de cada tour (salvo los centrados en pantalla)
        // muestra solo un punto pulsante que hay que clicar antes de que aparezca el
        // globo con las instrucciones — el texto explicativo nunca llega a verse a
        // menos que el usuario descubra ese clic escondido. Lo salta siempre.
        skipBeacon: true,
        showProgress: true,
        scrollOffset: 90,
        primaryColor: COLORS.mid,
        textColor: COLORS.text,
        backgroundColor: COLORS.surface,
        arrowColor: COLORS.surface,
        overlayColor: "rgba(24, 48, 36, .68)",
        spotlightRadius: 14,
        // Por debajo de CUALQUIER modal de la app a propósito (los más bajos usan 50,
        // el propio ? de Guías usa 9999, los toasts 10000): así, si el usuario abre un
        // modal mientras el tour corre (p. ej. "Editar lote" al hacer clic en un
        // lote), el modal queda naturalmente ARRIBA y totalmente usable, en vez de
        // quedar tapado por la sobrecapa del tour. Solo por encima del contenido y
        // la navegación normales (que llegan hasta ~41).
        //
        // Un tour puede pedir un valor más alto (ver `zIndex` en tours/definitions.js)
        // cuando sus propias anclas viven DENTRO de un modal de la app — ahí el modal
        // no es "ajeno" al tour, es lo que está señalando, así que el tour necesita
        // quedar POR ENCIMA de ese modal en particular para que se vea.
        zIndex: tour.zIndex ?? 45,
        // Que el clic en el fondo no lo cierre por accidente; para salir están la ×
        // y "Saltar".
        overlayClickAction: "none",
      }}
      styles={{
        tooltip: { borderRadius: 18, padding: 20 },
        tooltipTitle: { color: COLORS.deep, fontSize: 17, fontWeight: 800, marginBottom: 6 },
        tooltipContent: { padding: "6px 0 2px", lineHeight: 1.55, fontSize: 14 },
        buttonPrimary: { borderRadius: 999, padding: "9px 18px", fontWeight: 700, fontSize: 13 },
        buttonBack: { color: COLORS.muted, fontSize: 13, marginRight: 8 },
        buttonSkip: { color: COLORS.muted, fontSize: 13 },
      }}
    />
  );
}

/** Relanza un tutorial ya visto (desde Configuración, por ejemplo). */
export function replayTour(key) {
  window.dispatchEvent(new CustomEvent("ownterra:replay-tour", { detail: { key } }));
}

export default GuidedTour;
