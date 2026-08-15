import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { calendarService } from "@/services/calendarService";
import { useAppContext } from "@/context/AppContext";
import useEscapeKey from "@/hooks/useEscapeKey";

/**
 * Modal "Conectar con Google Calendar". Muestra la URL secreta del feed .ics del
 * usuario y las instrucciones para suscribirla una sola vez. Después, cada evento
 * que cree en OwnTerra aparece solo en su calendario (una vía, refresca c/ horas).
 */
export default function ConnectCalendarModal({ onClose }) {
  const [copied, setCopied] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const qc = useQueryClient();
  const { showToast, showError } = useAppContext();
  useEscapeKey(onClose, true);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["calendar-subscription"],
    queryFn: () => calendarService.getSubscription(),
    staleTime: 300_000,
  });

  // Estado de la conexión OAuth con Google (para videollamadas Meet).
  const { data: g } = useQuery({
    queryKey: ["calendar-google-status"],
    queryFn: () => calendarService.googleStatus(),
    staleTime: 60_000,
  });

  // El popup de Google avisa al terminar (postMessage); refrescamos el estado.
  useEffect(() => {
    const onMsg = (e) => {
      if (e.data?.type === "gcal-connected") {
        setConnecting(false);
        qc.invalidateQueries({ queryKey: ["calendar-google-status"] });
        showToast("Google conectado. Ya puedes crear eventos con Meet.");
      } else if (e.data?.type === "gcal-error") {
        setConnecting(false);
        showToast("No se pudo conectar con Google.", "warning");
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [qc, showToast]);

  const connectGoogle = async () => {
    try {
      setConnecting(true);
      const { auth_url } = await calendarService.googleConnect();
      window.open(auth_url, "gcal", "width=500,height=680");
    } catch (err) {
      setConnecting(false);
      showError(err, "No se pudo iniciar la conexión con Google");
    }
  };

  const disconnectGoogle = async () => {
    try {
      await calendarService.googleDisconnect();
      qc.invalidateQueries({ queryKey: ["calendar-google-status"] });
      showToast("Google desconectado.");
    } catch (err) {
      showError(err, "No se pudo desconectar");
    }
  };

  const url = data?.url || "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard no disponible */
    }
  };

  return (
    <div className="ag-modal-backdrop" onClick={onClose}>
      <div className="ag-modal cc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ag-modal-head">
          <div>
            <h3>Conectar con Google Calendar</h3>
            <p>Conéctalo una vez y tus eventos de OwnTerra aparecerán solos en tu calendario.</p>
          </div>
          <button type="button" onClick={onClose}>Cerrar</button>
        </div>

        <div className="cc-body">
          {g?.configured ? (
            <div className={`cc-google ${g.connected ? "on" : ""}`}>
              <div className="cc-google-main">
                <div className="cc-google-ico">
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 11v6m3-3H9m10.5 6h-15A1.5 1.5 0 0 1 3 18.5v-11A1.5 1.5 0 0 1 4.5 6h15A1.5 1.5 0 0 1 21 7.5v11a1.5 1.5 0 0 1-1.5 1.5M7 3v4m10-4v4" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round"/></svg>
                </div>
                <div className="cc-google-txt">
                  <div className="cc-google-title">
                    Videollamadas con Google Meet
                    {g.connected ? <span className="cc-badge-on">Conectado</span> : null}
                  </div>
                  <div className="cc-google-sub">
                    {g.connected
                      ? `Cuenta: ${g.email || "Google"} · al crear un evento podrás agregar un enlace de Meet.`
                      : "Conecta tu Google para crear eventos con enlace de videollamada."}
                  </div>
                </div>
              </div>
              {g.connected
                ? <button type="button" className="cc-google-btn ghost" onClick={disconnectGoogle}>Desconectar</button>
                : <button type="button" className="cc-google-btn" onClick={connectGoogle} disabled={connecting}>
                    {connecting ? "Conectando…" : "Conectar Google"}
                  </button>}
            </div>
          ) : null}

          {g?.configured ? <div className="cc-divider"><span>o suscribe tu calendario (solo lectura)</span></div> : null}

          {isLoading ? (
            <div className="cc-loading">Generando tu enlace seguro…</div>
          ) : isError ? (
            <div className="cc-error">
              No pudimos generar tu enlace. <button type="button" onClick={() => refetch()}>Reintentar</button>
            </div>
          ) : (
            <>
              <label className="cc-url-label">Tu enlace privado de calendario</label>
              <div className="cc-url-row">
                <input className="cc-url" value={url} readOnly onFocus={(e) => e.target.select()} />
                <button type="button" className="ag-primary cc-copy" onClick={copy}>
                  {copied ? "¡Copiado!" : "Copiar"}
                </button>
              </div>
              <p className="cc-hint">🔒 Es un enlace privado y solo de lectura. No lo compartas: quien lo tenga puede ver tu agenda.</p>

              <div className="cc-steps">
                <div className="cc-step">
                  <span className="cc-num">1</span>
                  <div>Copia el enlace de arriba.</div>
                </div>
                <div className="cc-step">
                  <span className="cc-num">2</span>
                  <div>
                    Abre <a href="https://calendar.google.com/calendar/u/0/r/settings/addbyurl" target="_blank" rel="noopener noreferrer">Google Calendar → Suscribirse con URL</a> (en el menú «Otros calendarios» → «Suscribirse con URL»).
                  </div>
                </div>
                <div className="cc-step">
                  <span className="cc-num">3</span>
                  <div>Pega el enlace y da «Agregar calendario». ¡Listo!</div>
                </div>
              </div>

              <p className="cc-note">
                Tus eventos aparecerán solos. Google actualiza los calendarios suscritos cada varias horas,
                así que un evento nuevo puede tardar un poco en verse. Es de una vía: se ven en Google, pero
                se crean y editan aquí en OwnTerra. Funciona igual en Apple Calendar y Outlook.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
