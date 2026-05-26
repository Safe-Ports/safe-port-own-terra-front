import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppContext } from "@/context/AppContext";
import Modal from "@/components/ui/Modal";
import InlineDocumentsPanel from "@/components/shared/InlineDocumentsPanel";
import { clientService } from "@/services/clientService";
import { currency, progress } from "@/services/formatters";

function ClientModal() {
  const { ui, closeModal, saveClient, editingClient, deleteClient } = useAppContext();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    type: "buyer",
    paidM: 0,
    totalM: 96,
    monthlyAmt: 0,
    notes: "",
    seller: "Patricia López"
  });

  useEffect(() => {
    setForm(
      editingClient || {
        name: "",
        phone: "",
        email: "",
        type: "buyer",
        paidM: 0,
        totalM: 96,
        monthlyAmt: 0,
        notes: "",
        seller: "Patricia López"
      }
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
          {editingClient ? <button className="btn-dan" onClick={() => deleteClient(editingClient.id)}>🗑 Eliminar</button> : null}
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
      <div className="fr-row">
        <div className="fg" style={{ flex: 1 }}>
          <label className="fl">Tipo de cliente</label>
          <select className="fi" value={form.type} onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}>
            <option value="buyer">Comprador</option>
            <option value="tenant">Arrendatario</option>
            <option value="lead">Prospecto</option>
          </select>
        </div>
        <div className="fg" style={{ flex: 1 }}>
          <label className="fl">Pagos realizados / Total</label>
          <div className="fr-row">
            <input className="fi" type="number" value={form.paidM} onChange={(event) => setForm((prev) => ({ ...prev, paidM: Number(event.target.value) }))} />
            <input className="fi" type="number" value={form.totalM} onChange={(event) => setForm((prev) => ({ ...prev, totalM: Number(event.target.value) }))} />
          </div>
        </div>
      </div>
      <div className="fg">
        <label className="fl">Monto mensual ($)</label>
        <input className="fi" type="number" value={form.monthlyAmt} onChange={(event) => setForm((prev) => ({ ...prev, monthlyAmt: Number(event.target.value) }))} />
      </div>
      <div className="fg">
        <label className="fl">Notas / interés</label>
        <textarea className="fi" rows="2" value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} />
      </div>
    </Modal>
  );
}

function ClientsPage() {
  const {
    clients,
    selectedClientId,
    setSelectedClientId,
    openModal,
    setEditingClient,
    openClientReport,
    sendReminder,
    sendClientMessage,
    openContractCreate,
  } = useAppContext();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      clients.filter((client) => {
        const matchesFilter = filter === "all" || client.type === filter;
        const matchesSearch = `${client.name} ${client.email || ""}`.toLowerCase().includes(search.toLowerCase());
        return matchesFilter && matchesSearch;
      }),
    [clients, filter, search]
  );

  const selected = clients.find((c) => c.id === selectedClientId) ||
    (typeof filtered[0]?.id === "string" ? filtered[0] : filtered[0]) ||
    null;

  // Fetch full detail (with summary) for the selected client
  const { data: selectedDetail } = useQuery({
    queryKey: ["client", selected?.id],
    queryFn: () => clientService.get(selected.id),
    enabled: !!selected?.id,
  });

  const summary = selectedDetail?.summary;
  const sellerName = selected?.seller?.name || selected?.seller || "—";
  const sellerInitials = selected?.seller?.initials || sellerName.slice(0, 2).toUpperCase();

  const paidM = summary?.total_paid != null ? Math.round(Number(summary.total_paid)) : null;
  const totalM = summary?.total_invested != null ? Math.round(Number(summary.total_invested)) : null;
  const monthlyAmt = summary?.next_payment?.amount ? Number(summary.next_payment.amount) : null;

  return (
    <>
      <div className="cl-layout">
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
            {[
              ["all", "Todos"],
              ["buyer", "Compradores"],
              ["tenant", "Arrendatarios"],
              ["lead", "Prospectos"],
            ].map(([value, label]) => (
              <div key={value} className={`cl-fp ${filter === value ? "act" : ""}`} onClick={() => setFilter(value)}>{label}</div>
            ))}
          </div>
          <div className="cl-list-body">
            {filtered.map((client) => (
              <div key={client.id} className={`cl-item ${selected?.id === client.id ? "act" : ""}`} onClick={() => setSelectedClientId(client.id)}>
                <div className="cl-av" style={{ background: client.color || "#2A7A50" }}>
                  {client.initials || client.name?.slice(0, 2).toUpperCase()}
                </div>
                <div className="cl-info">
                  <div className="cl-name">{client.name}</div>
                  <div className="cl-sub">{client.email || "Sin correo"}</div>
                </div>
                <div className="cl-type-chip chip ch-lo">{client.type}</div>
              </div>
            ))}
            {clients.length === 0 && (
              <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--mu)", fontSize: ".8rem" }}>
                Sin clientes aún. Crea el primero.
              </div>
            )}
          </div>
        </div>

        <div className="cl-det-card">
          {selected ? (
            <>
              <div className="cl-det-hd">
                <div className="cl-det-av" style={{ background: selected.color || "#2A7A50" }}>
                  {selected.initials || selected.name?.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="cl-det-nm">{selected.name}</div>
                  <div className="cl-det-sub">{selected.email || "Sin correo"} · {selected.phone || "Sin teléfono"}</div>
                </div>
                <button className="btn-s" style={{ padding: "6px 12px", fontSize: ".76rem" }} onClick={() => { setEditingClient(selected); openModal("clientModal"); }}>
                  Editar
                </button>
              </div>

              <div className="cl-det-body">
                {sellerName !== "—" && (
                  <div className="owner-card">
                    <div className="ow-av" style={{ background: "#183024" }}>{sellerInitials}</div>
                    <div>
                      <div className="ow-nm">{sellerName}</div>
                      <div className="ow-mt">Asesor asignado</div>
                    </div>
                  </div>
                )}

                {summary && (
                  <div className="price-row">
                    <div className="price-c">
                      <div className="pc-l">Total pagado</div>
                      <div className="pc-v">{currency(Number(summary.total_paid))}</div>
                    </div>
                    <div className="price-c">
                      <div className="pc-l">Saldo pendiente</div>
                      <div className="pc-v">{currency(Number(summary.balance))}</div>
                    </div>
                  </div>
                )}

                <div className="d-sec">
                  <div className="sec-hd">Seguimiento</div>
                  {summary ? (
                    <>
                      <div className="d-row"><span className="d-lbl">Contratos activos</span><span className="d-val">{summary.contracts_count}</span></div>
                      <div className="d-row"><span className="d-lbl">Pagos vencidos</span><span className="d-val">{summary.overdue_payments}</span></div>
                      <div className="d-row"><span className="d-lbl">Pagos pendientes</span><span className="d-val">{summary.pending_payments}</span></div>
                      {summary.next_payment && (
                        <div className="d-row">
                          <span className="d-lbl">Próximo pago</span>
                          <span className="d-val">{summary.next_payment.due_date} · {currency(Number(summary.next_payment.amount))}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="d-row"><span className="d-lbl">Cargando resumen...</span></div>
                  )}
                  {selected.notes && (
                    <div className="d-row"><span className="d-lbl">Notas</span><span className="d-val">{selected.notes}</span></div>
                  )}
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                  <button className="btn-s" style={{ padding: "6px 12px", fontSize: ".76rem" }} onClick={() => sendClientMessage(selected)}>💬 Mensaje</button>
                  {selected.type === "lead" ? (
                    <button className="btn-p" style={{ padding: "6px 12px", fontSize: ".76rem" }} onClick={() => openContractCreate({ clientId: selected.id, type: "reserve" })}>+ Crear Reserva</button>
                  ) : null}
                  <button className="btn-s" style={{ padding: "6px 12px", fontSize: ".76rem" }} onClick={() => openContractCreate({ clientId: selected.id })}>📄 Nuevo Contrato</button>
                  {selected.type !== "lead" ? (
                    <button className="btn-p" style={{ padding: "6px 12px", fontSize: ".76rem", background: "#C9A84C", color: "#1F1F1F" }} onClick={() => openClientReport(selected.id)}>🖨 Estado de Cuenta</button>
                  ) : null}
                  {selected.status === "overdue" ? (
                    <button className="btn-dan" style={{ padding: "6px 12px", fontSize: ".76rem" }} onClick={() => sendReminder(selected.name)}>📲 Recordar</button>
                  ) : null}
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
