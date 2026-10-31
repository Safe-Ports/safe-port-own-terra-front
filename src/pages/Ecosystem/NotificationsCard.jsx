import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HiSpeakerWave, HiSpeakerXMark } from "react-icons/hi2";
import { playNotification, setSoundEnabled, soundEnabled } from "@/utils/sounds";
import { notificationService } from "@/services/notificationService";

// Las notificaciones son del Core (las mandan todas las apps), así que viven en
// Mi Día. El número del botón "Mi Día" de la barra superior es el de sin leer de
// aquí: si no se listan, ese número no se puede leer ni bajar.
const PAGE = 30;

function dayLabel(iso) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const same = (a, b) => a.toDateString() === b.toDateString();
  if (same(d, today)) return "Hoy";
  if (same(d, yesterday)) return "Ayer";
  return d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
}

function groupByDay(items) {
  const groups = [];
  for (const n of items) {
    const label = dayLabel(n.created_at);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(n);
    else groups.push({ label, items: [n] });
  }
  return groups;
}

export default function NotificationsCard() {
  const qc = useQueryClient();
  const [soundOn, setSoundOn] = useState(() => soundEnabled("notifications"));
  const toggleSound = () => {
    setSoundEnabled("notifications", !soundOn);
    setSoundOn(!soundOn);
    if (!soundOn) playNotification();
  };
  const { data, isLoading, isError } = useQuery({
    queryKey: ["notifications", "list"],
    queryFn: () => notificationService.list({ limit: PAGE }),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["notifications"] });
    qc.invalidateQueries({ queryKey: ["notifications-unread"] });
  };
  const markOne = useMutation({ mutationFn: (id) => notificationService.markRead(id), onSuccess: refresh });
  const markAll = useMutation({ mutationFn: () => notificationService.markAllRead(), onSuccess: refresh });

  const items = data?.items || [];
  const unread = data?.unread_count ?? items.filter((n) => !n.is_read).length;
  const hidden = Math.max(0, (data?.total || 0) - items.length);

  return (
    <div className="md-card md-notifs">
      <div className="md-card-head">
        <div>
          <div className="md-card-title">Notificaciones</div>
          <div className="md-card-sub">
            {unread ? `${unread} sin leer · de todas tus apps` : "de todas tus apps"}
          </div>
        </div>
        <div className="md-notif-actions">
          <button
            type="button"
            className="md-notif-sound"
            onClick={toggleSound}
            aria-pressed={soundOn}
            title={soundOn ? "Silenciar el sonido de avisos" : "Activar el sonido de avisos"}
          >
            {soundOn ? <HiSpeakerWave aria-hidden /> : <HiSpeakerXMark aria-hidden />}
            {soundOn ? "Sonido" : "Sin sonido"}
          </button>
          {unread > 0 && (
            <button className="sh-link" disabled={markAll.isPending} onClick={() => markAll.mutate()}>
              Marcar todas como leídas
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="md-notif-empty">Cargando notificaciones…</div>
      ) : isError ? (
        <div className="md-notif-empty">No se pudieron cargar las notificaciones.</div>
      ) : items.length === 0 ? (
        <div className="md-notif-empty">No tienes notificaciones.</div>
      ) : (
        groupByDay(items).map((group) => (
          <div key={group.label} className="md-notif-group">
            <div className="md-notif-day">{group.label}</div>
            {group.items.map((n) => (
              <div key={n.id} className={`md-notif ${n.is_read ? "" : "is-unread"}`}>
                <span className="md-notif-dot" aria-hidden="true" />
                <div className="md-info">
                  <div className="md-name">{n.title}</div>
                  {n.body && <div className="md-notif-body">{n.body}</div>}
                  <div className="md-meta">{n.relative_time}</div>
                </div>
                {!n.is_read && (
                  <button
                    className="md-open"
                    disabled={markOne.isPending && markOne.variables === n.id}
                    onClick={() => markOne.mutate(n.id)}
                    aria-label={`Marcar como leída: ${n.title}`}
                  >
                    Marcar leída
                  </button>
                )}
              </div>
            ))}
          </div>
        ))
      )}

      {hidden > 0 && <div className="md-notif-more">Se muestran las {items.length} más recientes de {data.total}.</div>}
    </div>
  );
}
