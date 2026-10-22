function btnStyle(disabled) {
  return {
    width: 30, height: 30, borderRadius: 8, border: "1px solid var(--bd)",
    background: disabled ? "var(--sf2)" : "#fff", color: disabled ? "var(--mu)" : "var(--tx)",
    cursor: disabled ? "default" : "pointer", display: "flex", alignItems: "center",
    justifyContent: "center", fontSize: ".8rem", fontFamily: "var(--font-body)", fontWeight: 700,
  };
}

// Recorta `rows` a la página pedida. Úsalo junto con <Pagination /> para paginar en cliente.
export function paginate(rows, page, limit) {
  const start = (page - 1) * limit;
  return rows.slice(start, start + limit);
}

export default function Pagination({ total, page, limit, onPage }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  if (total <= limit) return null;
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "10px 16px", borderTop: "1px solid var(--line-soft)", background: "var(--sf2)",
      flexWrap: "wrap", gap: 8,
    }}>
      <span style={{ fontSize: ".75rem", color: "var(--mu)" }}>
        Mostrando {from} a {to} de {total}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <button style={btnStyle(page === 1)} disabled={page === 1} onClick={() => onPage(1)}>«</button>
        <button style={btnStyle(page === 1)} disabled={page === 1} onClick={() => onPage(page - 1)}>‹</button>
        <span style={{
          padding: "4px 12px", borderRadius: 8, background: "var(--earth)",
          color: "#fff", fontSize: ".8rem", fontWeight: 700,
        }}>{page}</span>
        <button style={btnStyle(page >= pages)} disabled={page >= pages} onClick={() => onPage(page + 1)}>›</button>
        <button style={btnStyle(page >= pages)} disabled={page >= pages} onClick={() => onPage(pages)}>»</button>
      </div>
    </div>
  );
}
