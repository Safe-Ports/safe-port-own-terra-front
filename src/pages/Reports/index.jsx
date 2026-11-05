import { useMemo, useState } from "react";
import GuideModal from "@/components/shared/GuideModal";
import { useSearchParams } from "react-router-dom";
import { HiOutlineMagnifyingGlass, HiOutlineUserCircle } from "react-icons/hi2";
import { useAppContext } from "@/context/AppContext";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { useLandsGuide } from "@/context/LandsGuideContext";
import ClientReport, { CLIENT_REPORT_STYLES } from "@/components/shared/ClientReport";

/* ── Lista de clientes (izquierda) ───────────────────────────── */
const AV_COLORS = ["#355E3B", "#2A5020", "#1E3D2B", "#4A7C5A", "#6FAF6B"];
function Avatar({ name = "?", size = 32 }) {
  const col = AV_COLORS[(name.charCodeAt(0) || 0) % AV_COLORS.length];
  const init = name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: col,
      color: "#fff", fontWeight: 800, fontSize: `${size * 0.36}px`,
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    }}>{init}</div>
  );
}

function ClientList({ clients, selectedId, onSelect, search, onSearch, loading }) {
  return (
    <aside data-tour="rp-clientes" style={{
      width: 280, flexShrink: 0, background: "var(--sf)",
      border: "1px solid var(--bd)", borderRadius: 20,
      boxShadow: "var(--sh)", overflow: "hidden",
      display: "flex", flexDirection: "column", maxHeight: "calc(100vh - 110px)",
    }}>
      <div style={{ padding: "14px 14px 10px", borderBottom: "1px solid var(--line-soft)" }}>
        <div style={{ fontSize: ".64rem", fontWeight: 800, letterSpacing: ".14em",
          textTransform: "uppercase", color: "var(--mu)", marginBottom: 8 }}>
          Clientes ({clients.length})
        </div>
        <div style={{ position: "relative" }}>
          <HiOutlineMagnifyingGlass style={{ position: "absolute", left: 9, top: "50%",
            transform: "translateY(-50%)", color: "var(--mu)", fontSize: ".95rem" }} />
          <input value={search} onChange={e => onSearch(e.target.value)}
            placeholder="Buscar cliente…"
            style={{ width: "100%", padding: "7px 10px 7px 30px",
              border: "1.5px solid var(--bd)", borderRadius: 10,
              fontSize: ".8rem", background: "var(--sf2)",
              fontFamily: "var(--font-body)", outline: "none", boxSizing: "border-box" }} />
        </div>
      </div>
      <div style={{ overflowY: "auto", flex: 1 }}>
        {loading && (
          <div style={{ padding: "12px" }}><SkeletonRows rows={6} /></div>
        )}
        {!loading && clients.length === 0 && (
          <div style={{ padding: "24px 14px", textAlign: "center", fontSize: ".8rem", color: "var(--mu)" }}>
            Sin resultados.
          </div>
        )}
        {!loading && clients.map(c => (
          <button key={c.id} onClick={() => onSelect(c.id)}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: "10px 14px", border: "none", cursor: "pointer",
              background: selectedId === c.id ? "var(--tan-lt)" : "transparent",
              borderLeft: selectedId === c.id ? "3px solid var(--forest)" : "3px solid transparent",
              fontFamily: "var(--font-body)", textAlign: "left",
            }}>
            <Avatar name={c.name} size={32} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: ".82rem", color: "var(--tx)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
              <div style={{ fontSize: ".7rem", color: "var(--mu)" }}>
                {c.email || c.phone || "—"}
              </div>
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
}

/* ── Reporte vacío ───────────────────────────────────────────── */
function EmptyReport() {
  return (
    <div style={{
      flex: 1, background: "var(--sf)", border: "1px solid var(--bd)",
      borderRadius: 20, padding: 60, textAlign: "center",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      minHeight: 500, gap: 14, boxShadow: "var(--sh)",
    }}>
      <HiOutlineUserCircle style={{ fontSize: "3.4rem", color: "var(--mu)", opacity: 0.5 }} />
      <div style={{ fontFamily: "var(--font-title)", fontSize: "1.3rem", color: "var(--tx)" }}>
        Selecciona un cliente
      </div>
      <div style={{ fontSize: ".88rem", color: "var(--mu)", maxWidth: 320, lineHeight: 1.5 }}>
        Elige un cliente de la lista para ver su reporte completo: saldo, contratos, pagos y comportamiento de pago.
      </div>
    </div>
  );
}

/* ══ PAGE ════════════════════════════════════════════════════════ */
export default function ReportsPage() {
  const { clients, clientsLoading } = useAppContext();
  const [search, setSearch]     = useState("");
  const [params, setParams] = useSearchParams();
  const selectedId = params.get("client");
  const setSelectedId = id => setParams(id ? { client: id } : {});
  const [showGuide, setShowGuide]   = useState(false);
  useLandsGuide(() => setShowGuide(true));

  const filteredClients = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return clients;
    return clients.filter(c =>
      `${c.name} ${c.email || ""} ${c.phone || ""}`.toLowerCase().includes(s)
    );
  }, [clients, search]);

  return (
    <>
      <style>{CLIENT_REPORT_STYLES}</style>

      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <div className="no-print">
          <ClientList
            clients={filteredClients}
            selectedId={selectedId}
            onSelect={setSelectedId}
            search={search}
            onSearch={setSearch}
            loading={clientsLoading}
          />
        </div>
        {selectedId ? <ClientReport clientId={selectedId} /> : <EmptyReport />}
      </div>
      <GuideModal
        open={showGuide}
        onClose={() => setShowGuide(false)}
        title="Estado de cuenta"
        subtitle="Reportes financieros profesionales por cliente con historial de pagos."
        steps={[
          { title: "Seleccionar cliente", text: "Busca y selecciona un cliente de la lista izquierda para generar su estado de cuenta. Puedes buscar por nombre, correo o teléfono." },
          { title: "Comportamiento de pago", text: "La gráfica de los últimos 12 meses muestra en verde los meses con pago puntual y en rojo los vencidos. Ideal para evaluar al cliente." },
          { title: "Resumen financiero", text: "Muestra el total contratado, lo ya pagado, el saldo pendiente y el progreso porcentual de cada contrato del cliente." },
          { title: "Plan de pagos detallado", text: "Tabla completa con cada cuota: número, fecha de vencimiento, monto, estado y fecha de pago aplicado." },
          { title: "Descargar PDF", text: "El botón de descarga genera el estado de cuenta en formato A4 listo para imprimir o enviar por correo." },
          { title: "Enviar por correo", text: "El botón de correo envía automáticamente el estado de cuenta al email registrado del cliente." },
        ]}
      />
    </>
  );
}
