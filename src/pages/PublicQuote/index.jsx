import { useEffect, useMemo, useState } from "react";
import api from "@/services/api";
import "./public-quote.css";

const money = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

export default function PublicQuote() {
  const token = useMemo(() => window.location.pathname.split("/cotizacion/")[1] || "", []);
  const [state, setState] = useState({ loading: true, data: null, error: "" });

  useEffect(() => {
    api.get(`/public/quotes/${token}`)
      .then(({ data }) => setState({ loading: false, data, error: "" }))
      .catch(() => setState({ loading: false, data: null, error: "Esta cotización venció o ya no está disponible." }));
  }, [token]);

  if (state.loading) return <main className="public-quote-state"><span className="pq-spinner" /><p>Preparando tu cotización…</p></main>;
  if (state.error) return <main className="public-quote-state"><h1>Cotización no disponible</h1><p>{state.error}</p></main>;

  const { development, lot, quotation, prospect_name: prospectName, notice } = state.data;
  const mapsUrl = development.latitude && development.longitude
    ? `https://www.google.com/maps/search/?api=1&query=${development.latitude},${development.longitude}`
    : null;

  return <main className="public-quote">
    <header className="pq-hero">
      <div className="pq-brand"><span>OT</span> OwnTerra</div>
      <div className="pq-hero-copy">
        <p>COTIZACIÓN PERSONALIZADA</p>
        <h1>{development.name}</h1>
        <span>{prospectName ? `Preparada para ${prospectName}` : "Información comercial del lote"}</span>
      </div>
      <div className={`pq-status ${lot.status}`}>{lot.status === "available" ? "Disponible" : lot.status === "reserved" ? "Apartado" : "Vendido"}</div>
    </header>
    <section className="pq-layout">
      <article className="pq-main-card">
        <div className="pq-lot-id"><span>Lote</span><strong>{lot.code}</strong></div>
        <div className="pq-price"><span>Precio de referencia</span><strong>{money.format(Number(lot.price || quotation.principal))}</strong></div>
        <div className="pq-facts">
          <div><span>Superficie</span><strong>{lot.area_m2 ? `${Number(lot.area_m2).toLocaleString("es-MX")} m²` : "Por confirmar"}</strong></div>
          <div><span>Medidas</span><strong>{lot.front_m && lot.depth_m ? `${lot.front_m} × ${lot.depth_m} m` : "Por confirmar"}</strong></div>
          <div><span>Enganche</span><strong>{money.format(Number(quotation.down_payment))}</strong></div>
          <div><span>Plazo</span><strong>{quotation.months} meses</strong></div>
        </div>
        {development.description && <p className="pq-description">{development.description}</p>}
        <div className="pq-actions">
          {mapsUrl && <a href={mapsUrl} target="_blank" rel="noreferrer">Ver ubicación</a>}
          <a className="primary" href={`https://wa.me/?text=${encodeURIComponent(`Hola, me interesa el lote ${lot.code} en ${development.name}.`)}`}>Me interesa</a>
        </div>
      </article>
      <aside className="pq-payment">
        <span>PLAN ESTIMADO</span>
        <p>Mensualidad desde</p>
        <strong>{money.format(Number(quotation.monthly_payment))}</strong>
        <dl><div><dt>Monto financiado</dt><dd>{money.format(Number(quotation.principal) - Number(quotation.down_payment))}</dd></div><div><dt>Tasa anual</dt><dd>{(Number(quotation.annual_rate) * 100).toFixed(2)}%</dd></div><div><dt>Total estimado</dt><dd>{money.format(Number(quotation.total_paid) + Number(quotation.down_payment))}</dd></div></dl>
        <small>{notice}</small>
      </aside>
    </section>
    <footer>La disponibilidad y las condiciones se actualizan desde OwnTerra. Confirma los datos con tu asesor antes de realizar un pago.</footer>
  </main>;
}
