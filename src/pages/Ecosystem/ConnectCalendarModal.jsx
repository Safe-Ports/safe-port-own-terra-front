import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { calendarService } from "@/services/calendarService";
import useEscapeKey from "@/hooks/useEscapeKey";

/**
 * Modal "Conectar con Google Calendar". Muestra la URL secreta del feed .ics del
 * usuario y las instrucciones para suscribirla una sola vez. Después, cada evento
 * que cree en OwnTerra aparece solo en su calendario (una vía, refresca c/ horas).
 */
export default function ConnectCalendarModal({ onClose }) {
  const [copied, setCopied] = useState(false);
  useEscapeKey(onClose, true);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["calendar-subscription"],
    queryFn: () => calendarService.getSubscription(),
    staleTime: 300_000,
  });

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
