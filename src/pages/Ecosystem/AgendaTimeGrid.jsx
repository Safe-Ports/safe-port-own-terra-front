import { useEffect, useMemo, useRef } from "react";
import { APP_META, DEFAULT_DURATION_MINUTES } from "./agendaShared";
import { useLocale } from "@/i18n";

// Altura en px de una hora en la rejilla — controla tanto el alto de las filas
// como la posición/alto de los bloques de evento, para que nunca se desalineen.
const HOUR_HEIGHT = 56;
const START_SCROLL_HOUR = 7; // hora inicial visible al entrar (como Google Calendar)
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HALF_HOURS = HOURS.flatMap((h) => [0, 30].map((m) => ({ h, m })));

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseTimeToMinutes(time) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

// Asigna cada evento de un día a un "carril" (como Google Calendar cuando hay
// traslape): recorre los eventos ordenados por hora y reutiliza el primer
// carril que ya quedó libre, o abre uno nuevo si ninguno lo está.
export function layoutDayEvents(items) {
  const sorted = [...items].sort((a, b) => a.startMinutes - b.startMinutes);
  const placed = [];
  let group = [];
  let groupEnd = -1;

  const flushGroup = () => {
    if (!group.length) return;
    const laneEnds = [];
    const groupItems = group.map((item) => {
      const endMinutes = item.startMinutes + DEFAULT_DURATION_MINUTES;
      let laneIndex = laneEnds.findIndex((end) => end <= item.startMinutes);
      if (laneIndex === -1) {
        laneIndex = laneEnds.length;
        laneEnds.push(endMinutes);
      } else {
        laneEnds[laneIndex] = endMinutes;
      }
      return { ...item, laneIndex };
    });
    const laneCount = Math.max(laneEnds.length, 1);
    placed.push(...groupItems.map((item) => ({ ...item, laneCount })));
    group = [];
  };

  for (const item of sorted) {
    const endMinutes = item.startMinutes + DEFAULT_DURATION_MINUTES;
    if (group.length && item.startMinutes >= groupEnd) {
      flushGroup();
      groupEnd = -1;
    }
    group.push(item);
    groupEnd = Math.max(groupEnd, endMinutes);
  }
  flushGroup();
  return placed;
}

function EventBlock({ item, onClick }) {
  const top = (item.startMinutes / 60) * HOUR_HEIGHT;
  const durationMinutes = Math.min(DEFAULT_DURATION_MINUTES, 1440 - item.startMinutes);
  const height = Math.max((durationMinutes / 60) * HOUR_HEIGHT, 22);
  const widthPct = 100 / item.laneCount;
  const leftPct = item.laneIndex * widthPct;
  const color = APP_META[item.app]?.color || APP_META.core.color;
  return (
    <button
      type="button"
      className="ag-event-block"
      style={{
        top,
        height,
        left: `${leftPct}%`,
        width: `calc(${widthPct}% - 4px)`,
        borderLeftColor: color,
      }}
      onClick={(e) => { e.stopPropagation(); onClick(item); }}
    >
      <span className="ag-event-block-time">{item.time}</span>
      <span className="ag-event-block-title">{item.title}</span>
    </button>
  );
}

function DayColumn({ day, items, isToday, onSlotClick, onEventClick, t }) {
  const nowTop = useMemo(() => {
    if (!isToday) return null;
    const now = new Date();
    return ((now.getHours() * 60 + now.getMinutes()) / 60) * HOUR_HEIGHT;
  }, [isToday]);

  return (
    <div className="ag-daycol" style={{ height: HOUR_HEIGHT * 24 }}>
      <div className="ag-daycol-slots">
        {HALF_HOURS.map(({ h, m }) => {
          const time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
          return (
            <button
              key={time}
              type="button"
              className="ag-slot"
              style={{ height: HOUR_HEIGHT / 2 }}
              onClick={(e) => onSlotClick(day.key, time, e.currentTarget.getBoundingClientRect())}
              aria-label={t("agenda.createAt").replace("{time}", time)}
            />
          );
        })}
      </div>
      <div className="ag-events-layer">
        {nowTop != null && <div className="ag-now-line" style={{ top: nowTop }} />}
        {items.map((item) => (
          <EventBlock key={item.id} item={item} onClick={onEventClick} />
        ))}
      </div>
    </div>
  );
}

function AgendaTimeGrid({ view, days, appointments, onSlotClick, onEventClick }) {
  const { t, localeTag } = useLocale();
  const bodyRef = useRef(null);
  const tKey = useMemo(todayKey, []);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = START_SCROLL_HOUR * HOUR_HEIGHT;
  }, [view, days]);

  const byDay = useMemo(() => {
    const map = {};
    for (const day of days) map[day.key] = [];
    for (const appt of appointments) {
      if (!map[appt.date]) continue;
      map[appt.date].push({ ...appt, startMinutes: parseTimeToMinutes(appt.time) });
    }
    for (const key of Object.keys(map)) map[key] = layoutDayEvents(map[key]);
    return map;
  }, [days, appointments]);

  return (
    <div className={`ag-timegrid ag-timegrid-${view}`}>
      <div className="ag-timegrid-head">
        <div className="ag-timegrid-corner" />
        <div className="ag-timegrid-daylabels">
          {days.map((day) => (
            <div key={day.key} className={`ag-timegrid-daylabel${day.key === tKey ? " today" : ""}`}>
              <span className="ag-timegrid-daylabel-dow">{new Intl.DateTimeFormat(localeTag, { weekday: "short" }).format(day.date)}</span>
              <span className="ag-timegrid-daylabel-num">{day.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="ag-timegrid-body" ref={bodyRef}>
        <div className="ag-timegrid-hours" style={{ height: HOUR_HEIGHT * 24 }}>
          {HOURS.map((h) => (
            <div key={h} className="ag-timegrid-hour" style={{ height: HOUR_HEIGHT }}>
              {h > 0 ? `${String(h).padStart(2, "0")}:00` : ""}
            </div>
          ))}
        </div>
        <div className="ag-timegrid-days">
          {days.map((day) => (
            <DayColumn
              key={day.key}
              day={day}
              items={byDay[day.key] || []}
              isToday={day.key === tKey}
              onSlotClick={onSlotClick}
              onEventClick={onEventClick}
              t={t}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default AgendaTimeGrid;
