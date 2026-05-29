import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppContext } from "@/context/AppContext";
import Modal from "@/components/ui/Modal";
import InlineDocumentsPanel from "@/components/shared/InlineDocumentsPanel";
import { clientService } from "@/services/clientService";
import { currency } from "@/services/formatters";

const TYPE_LABEL = { buyer: "Comprador", tenant: "Arrendatario", lead: "Prospecto" };
const TYPE_COLOR = { buyer: "#2A7A50", tenant: "#1B2B18", lead: "#B07820" };
const CONTRACT_STATUS_LABEL = { active: "Activo", completed: "Completado", cancelled: "Cancelado", reserved: "Apartado" };
const LOT_STATUS_LABEL = { available: "Disponible", sold: "Vendido", reserved: "Apartado" };
const LOT_STATUS_COLOR = { available: "#2A7A50", sold: "#C0392B", reserved: "#B07820" };

function ClientModal() {
  const { ui, closeModal, saveClient, editingClient, deleteClient } = useAppContext();
  const [form, setForm] = useState({ name: "", phone: "", email: "", type: "buyer", notes: "" });

  useEffect(() => {
    setForm(
      editingClient
        ? { name: editingClient.name || "", phone: editingClient.phone || "", email: editingClient.email || "", type: editingClient.type || "buyer", notes: editingClient.notes || "" }
        : { name: "", phone: "", email: "", type: "buyer", notes: "" }
    );
  }, [editingClient, ui.clientModal]);

  return (
    <Modal
      open={ui.clientModal}
      icon="👤"
      title={editingClient ? "Editar cliente" : "Nuevo cliente"}
      subtitle="Registro en el CRM"
      onClose={() => closeModal("clientModal")}
      footer={
        <>
          <button className="btn-s" onClick={() => closeModal("clientModal")}>Cancelar</button>
          {editingClient && <button className="btn-dan" onClick={() => deleteClient(editingClient.id)}>🗑 Eliminar</button>}
          <button className="btn-p" onClick={() => saveClient({ ...(editingClient || {}), ...form })}>✓ Guardar</button>
        </>
      }
    >
      <div className="fr-row">
        <div className="fg" style={{ flex: 1 }}>
          <label className="fl">Nombre completo</label>
          <input className="fi" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
        </div>
        <div className="fg" style={{ flex: 1 }}>
          <label className="fl">Teléfono</label>
          <input className="fi" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
        </div>
      </div>
      <div className="fg">
        <label className="fl">Correo electrónico</label>
        <input className="fi" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
      </div>
      <div className="fg">
        <label className="fl">Tipo de cliente</label>
        <select className="fi" value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
          <option value="buyer">Comprador</option>
          <option value="tenant">Arrendatario</option>
          <option value="lead">Prospecto</option>
        </select>
      </div>
      <div className="fg">
        <label className="fl">Notas</label>
        <textarea className="fi" rows="2" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
      </div>
    </Modal>
  );
}

function ClientsPage() {
  const {
    clients, contracts, payments,
    selectedClientId, setSelectedClientId,
    openModal, setEditingClient,
    openClientReport, sendReminder, sendClientMessage, openContractCreate,
  } = useAppContext();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () => clients.filter((c) => {
      const matchesFilter = filter === "all" || c.type === filter;
      const matchesSearch = `${c.name} ${c.email || ""}`.toLowerCase().includes(search.toLowerCase());
      return matchesFilter && matchesSearch;
    }),
    [clients, filter, search]
  );

  const selected = clients.find((c) => c.id === selectedClientId) || filtered[0] || null;

  const { data: selectedDetail } = useQuery({
    queryKey: ["client", selected?.id],
    queryFn: () => clientService.get(selected.id),
    enabled: !!selected?.id,
  });

  const summary = selectedDetail?.summary;
  const sellerName = selected?.seller?.name || selected?.seller || "";
  const sellerInitials = selected?.seller?.initials || sellerName.slice(0, 2).toUpperCase();

  // Client's contracts + payment progress
  const clientContracts = useMemo(
    () => contracts.filter((c) => String(c.client?.id) === String(selected?.id)),
    [contracts, selected?.id]
  );

  const paidCountByContract = useMemo(() => {
    const map = {};
    payments.forEach((p) => {
      if (!p.contract?.id) return;
      const key = String(p.contract.id);
      if (!map[key]) map[key] = { paid: 0, total: 0 };
      map[key].total += 1;
      if (p.status === "paid") map[key].paid += 1;
    });
    return map;
  }, [payments]);

  return (
    <>
      <div className="cl-layout">
        {/* ── LEFT: client list ── */}
        <div className="cl-list-card">
          <div className="cl-hd">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontWeight: 700, fontSize: ".87rem" }}>Clientes</div>
              <button className="btn-p" style={{ padding: "5px 12px", fontSize: ".74rem" }} onClick={() => openModal("clientModal")}>+ Nuevo</button>
            </div>
            <div className="cl-src">
              <span style={{ color: "var(--mu)" }}>🔍</span>
              <input type="text" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="cl-filters">
            {[["all","Todos"],["buyer","Compradores"],["tenant","Arrendatarios"],["lead","Prospectos"]].map(([v, l]) => (
              <div key={v} className={`cl-fp ${filter === v ? "act" : ""}`} onClick={() => setFilter(v)}>{l}</div>
            ))}
          </div>
          <div className="cl-list-body">
            {filtered.map((client) => (
              <div key={client.id} className={`cl-item ${selected?.id === client.id ? "act" : ""}`} onClick={() => setSelectedClientId(client.id)}>
                <div className="cl-av" style={{ background: client.color || TYPE_COLOR[client.type] || "#2A7A50" }}>
                  {client.initials || client.name?.slice(0, 2).toUpperCase()}
                </div>
                <div className="cl-info">
                  <div className="cl-name">{client.name}</div>
                  <div className="cl-sub">{client.email || client.phone || "Sin contacto"}</div>
                </div>
                <div className="cl-type-chip chip ch-lo" style={{ background: `${TYPE_COLOR[client.type]}18`, color: TYPE_COLOR[client.type], border: `1px solid ${TYPE_COLOR[client.type]}30` }}>
                  {TYPE_LABEL[client.type] || client.type}
                </div>
              </div>
            ))}
            {clients.length === 0 && (
              <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--mu)", fontSize: ".8rem" }}>
                Sin clientes aún. Crea el primero.
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: client detail ── */}
        <div className="cl-det-card">
          {selected ? (
            <>
              {/* Header */}
              <div className="cl-det-hd">
                <div className="cl-det-av" style={{ background: selected.color || TYPE_COLOR[selected.type] || "#2A7A50" }}>
                  {selected.initials || selected.name?.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="cl-det-nm">{selected.name}</div>
                  <div className="cl-det-sub">
                    {selected.email || "Sin correo"}{selected.phone ? ` · ${selected.phone}` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <a href={`tel:${selected.phone}`} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 10, border: "1.5px solid #DED5C8", background: "#fff", fontSize: "1rem", cursor: "pointer", textDecoration: "none" }}>📞</a>
                  <a href={`mailto:${selected.email}`} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 10, border: "1.5px solid #DED5C8", background: "#fff", fontSize: "1rem", cursor: "pointer", textDecoration: "none" }}>✉️</a>
                  <a href={`https://wa.me/${(selected.phone || "").replace(/\D/g,"")}`} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 10, border: "1.5px solid #DED5C8", background: "#fff", fontSize: "1rem", cursor: "pointer", textDecoration: "none" }}>💬</a>
                  <button className="btn-s" style={{ padding: "6px 14px", fontSize: ".76rem" }} onClick={() => { setEditingClient(selected); openModal("clientModal"); }}>
                    Editar
                  </button>
                </div>
              </div>

              <div className="cl-det-body">
                {/* Seller */}
                {sellerName && (
                  <div className="owner-card">
                    <div className="ow-av" style={{ background: "#1B2B18" }}>{sellerInitials}</div>
                    <div>
                      <div className="ow-nm">{sellerName}</div>
                      <div className="ow-mt">Asesor asignado</div>
                    </div>
                  </div>
                )}

                {/* Financial summary */}
                {summary && (
                  <div className="price-row">
                    <div className="price-c">
                      <div className="pc-l">Total pagado</div>
                      <div className="pc-v">{currency(Number(summary.total_paid))}</div>
                      {summary.last_payment_date && (
                        <div style={{ fontSize: ".62rem", color: "var(--mu)", marginTop: 2 }}>
                          Último: {summary.last_payment_date}
                        </div>
                      )}
                    </div>
                    <div className="price-c">
                      <div className="pc-l">Saldo pendiente</div>
                      <div className="pc-v">{currency(Number(summary.balance))}</div>
                      {summary.next_payment && (
                        <div style={{ fontSize: ".62rem", color: "var(--mu)", marginTop: 2 }}>
                          Próximo: {summary.next_payment.due_date}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Seguimiento */}
                <div className="d-sec">
                  <div className="sec-hd">Seguimiento</div>
                  {summary ? (
                    <>
                      <div className="d-row"><span className="d-lbl">Contratos activos</span><span className="d-val">{summary.contracts_count}</span></div>
                      <div className="d-row"><span className="d-lbl">Pagos vencidos</span><span className="d-val" style={{ color: summary.overdue_payments > 0 ? "#C0392B" : undefined }}>{summary.overdue_payments}</span></div>
                      <div className="d-row"><span className="d-lbl">Pagos pendientes</span><span className="d-val">{summary.pending_payments}</span></div>
                    </>
                  ) : (
                    <div className="d-row"><span className="d-lbl" style={{ opacity: .5 }}>Cargando...</span></div>
                  )}
                  {selected.notes && (
                    <div className="d-row"><span className="d-lbl">Notas</span><span className="d-val">{selected.notes}</span></div>
                  )}
                </div>

                {/* Lotes asociados */}
                {clientContracts.length > 0 && (
                  <div className="d-sec">
                    <div className="sec-hd">Lotes Asociados ({clientContracts.length})</div>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".78rem" }}>
                        <thead>
                          <tr style={{ borderBottom: "1.5px solid #EDE8E0" }}>
                            {["ID Lote", "Proyecto", "Estado", "Medidas", "Progreso"].map((h) => (
                              <th key={h} style={{ textAlign: "left", padding: "5px 8px", fontSize: ".6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#8C8070", whiteSpace: "nowrap" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {clientContracts.map((contract) => {
                            const lot = contract.lot;
                            const prog = paidCountByContract[String(contract.id)];
                            const lotStatus = lot?.lot_status || (contract.type === "reserve" ? "reserved" : "sold");
                            const statusLabel = LOT_STATUS_LABEL[lotStatus] || lotStatus;
                            const statusColor = LOT_STATUS_COLOR[lotStatus] || "#8C8070";
                            return (
                              <tr key={contract.id} style={{ borderBottom: "1px solid #F0EDE6" }}>
                                <td style={{ padding: "7px 8px", fontWeight: 700, color: "#1A1410" }}>{lot?.code || "—"}</td>
                                <td style={{ padding: "7px 8px", color: "#5C5040" }}>{lot?.inmueble_name || "—"}</td>
                                <td style={{ padding: "7px 8px" }}>
                                  <span style={{ background: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}30`, borderRadius: 6, padding: "2px 8px", fontSize: ".65rem", fontWeight: 700 }}>
                                    {statusLabel}
                                  </span>
                                </td>
                                <td style={{ padding: "7px 8px", color: "#5C5040" }}>
                                  {lot?.area_m2 ? `${lot.area_m2} m²` : "—"}
                                </td>
                                <td style={{ padding: "7px 8px", color: "#5C5040" }}>
                                  {prog
                                    ? `${contract.type === "reserve" ? "Enganche" : "Pagos"} (${prog.paid}/${prog.total} cuotas)`
                                    : CONTRACT_STATUS_LABEL[contract.status] || contract.status}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                  <button className="btn-s" style={{ padding: "7px 14px", fontSize: ".78rem" }} onClick={() => sendClientMessage(selected)}>
                    💬 Mensaje
                  </button>
                  <button className="btn-s" style={{ padding: "7px 14px", fontSize: ".78rem" }} onClick={() => openContractCreate({ clientId: selected.id })}>
                    📄 Nuevo Contrato
                  </button>
                  {selected.type === "lead" && (
                    <button className="btn-p" style={{ padding: "7px 14px", fontSize: ".78rem" }} onClick={() => openContractCreate({ clientId: selected.id, type: "reserve" })}>
                      🔒 Registrar Apartado
                    </button>
                  )}
                  {selected.type !== "lead" && (
                    <button className="btn-p" style={{ padding: "7px 14px", fontSize: ".78rem", background: "#C9A84C", color: "#1F1F1F" }} onClick={() => openClientReport(selected.id)}>
                      🖨 Estado de Cuenta
                    </button>
                  )}
                  {selected.status === "overdue" && (
                    <button className="btn-dan" style={{ padding: "7px 14px", fontSize: ".78rem" }} onClick={() => sendReminder(selected.name)}>
                      📲 Recordar
                    </button>
                  )}
                </div>

                <InlineDocumentsPanel entityType="client" entityId={selected.id} entityLabel={selected.name} />
              </div>
            </>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 12, color: "var(--mu)", padding: 40, textAlign: "center" }}>
              <div style={{ fontSize: "2.8rem", opacity: 0.18 }}>👤</div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1rem", color: "var(--tx)", opacity: 0.35 }}>Selecciona un cliente</div>
              <div style={{ fontSize: ".78rem", maxWidth: 190, lineHeight: 1.5 }}>Elige un cliente de la lista para ver su expediente completo</div>
            </div>
          )}
        </div>
      </div>

      <ClientModal />
    </>
  );
}

export default ClientsPage;
