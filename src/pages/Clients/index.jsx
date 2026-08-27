import { useEffect, useMemo, useState } from "react";
import {
  HiChatBubbleLeftRight,
  HiCheck,
  HiDocumentText,
  HiEnvelope,
  HiExclamationTriangle,
  HiGlobeAlt,
  HiLink,
  HiLockClosed,
  HiMagnifyingGlass,
  HiPhone,
  HiPrinter,
  HiTrash,
  HiUser,
  HiUserGroup,
} from "react-icons/hi2";
import GuideModal from "@/components/shared/GuideModal";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "@/context/AppContext";
import { useLandsGuide } from "@/context/LandsGuideContext";
import Modal from "@/components/ui/Modal";
import InlineDocumentsPanel from "@/components/shared/InlineDocumentsPanel";
import FieldError from "@/components/shared/FieldError";
import ClientForm, { CLIENT_FIELD_MAP, useClientForm } from "@/components/shared/ClientForm";
import PhoneInput from "@/components/shared/PhoneInput";
import { useFieldErrors } from "@/hooks/useFieldErrors";
import Button from "@/components/Button";
import Avatar from "@/components/Avatar";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { clientService } from "@/services/clientService";
import { contractService } from "@/services/contractService";
import { currency } from "@/services/formatters";
import { getClientEcosystem, CORE_APPS } from "@/services/ecosystemCore";

const TYPE_LABEL = { buyer: "Comprador", tenant: "Arrendatario", lead: "Prospecto" };
const TYPE_COLOR = { buyer: "#355E3B", tenant: "#1E3D2B", lead: "#9D6B18" };
const CONTRACT_STATUS_LABEL = { active: "Activo", completed: "Completado", cancelled: "Cancelado", reserved: "Apartado" };
const LOT_STATUS_LABEL = { available: "Disponible", sold: "Vendido", reserved: "Apartado" };
const LOT_STATUS_COLOR = { available: "#355E3B", sold: "#C0392B", reserved: "#9D6B18" };

/**
 * Alta/edición de cliente. Los campos y las validaciones viven en ClientForm,
 * compartido con el alta rápida del ClientPicker: así el formulario es
 * literalmente el mismo se abra desde donde se abra.
 *
 * La `key` del padre lo remonta al cambiar de cliente, que es lo que reinicia
 * el estado del hook sin necesidad de un efecto de sincronización.
 */
function ClientModalInner() {
  const { closeModal, saveClient, editingClient, deleteClient, clients, showError } = useAppContext();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const ctl = useClientForm(editingClient, clients);
  const { fe, dupe } = ctl;

  const submit = async () => {
    if (!ctl.validate()) return;
    setSaving(true);
    try {
      await saveClient(ctl.payload());
    } catch (err) {
      // 422 con detalle por campo → marcar campos; si no, error de catálogo (toast OT-…).
      if (!fe.fromServer(err, CLIENT_FIELD_MAP)) showError(err, "Error al guardar el cliente");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      icon={<HiUser />}
      title={editingClient ? "Editar cliente" : "Agregar cliente"}
      subtitle={editingClient ? "Identidad del ecosistema" : "Identidad única del ecosistema"}
      onClose={() => closeModal("clientModal")}
      footer={
        <>
          <Button variant="secondary" onClick={() => closeModal("clientModal")}>Cancelar</Button>
          {editingClient && <Button variant="danger" onClick={() => deleteClient(editingClient.id)}><HiTrash /> Eliminar</Button>}
          <Button variant="primary" onClick={submit} disabled={saving}>
            {saving ? "Guardando..." : dupe ? <><HiLink /> Vincular a Lands</> : <><HiCheck /> Guardar</>}
          </Button>
        </>
      }
    >
      {editingClient && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", background: "var(--sf2)", border: "1px solid var(--bd)", borderRadius: 12, padding: "9px 12px", marginBottom: 14, fontSize: ".74rem", color: "var(--mu)" }}>
          <span><HiGlobeAlt /> La identidad se sincroniza con el ecosistema.</span>
          <button type="button" onClick={() => { closeModal("clientModal"); navigate("/ecosistema/clientes"); }} style={{ color: "var(--forest)", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
            Editar en el core →
          </button>
        </div>
      )}

      <ClientForm ctl={ctl} isEditing={!!editingClient} />
    </Modal>
  );
}

function ClientModal() {
  const { ui, editingClient } = useAppContext();
  if (!ui.clientModal) return null;
  // La key remonta el formulario al cambiar de cliente (o al pasar de editar a
  // crear), que es lo que lo deja limpio sin un efecto de sincronización.
  return <ClientModalInner key={editingClient?.id || "new"} />;
}

function ClientsPage() {
  const {
    clients, contracts, payments, clientsLoading,
    selectedClientId, setSelectedClientId,
    openModal, setEditingClient,
    openClientReport, sendClientMessage, openContractCreate,
    showError,
  } = useAppContext();
  const [showGuide, setShowGuide] = useState(false);
  useLandsGuide(() => setShowGuide(true));
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cancelDraft, setCancelDraft] = useState(null); // { contract } | null
  const [cancelForm, setCancelForm] = useState({ reason: "", refund_amount: "" });
  const [cancelling, setCancelling] = useState(false);

  const openCancelModal = (contract) => {
    setCancelDraft({ contract });
    setCancelForm({ reason: "", refund_amount: "" });
  };

  const submitCancel = async () => {
    if (!cancelDraft || !cancelForm.reason.trim()) return;
    setCancelling(true);
    try {
      await contractService.cancel(cancelDraft.contract.id, {
        reason: cancelForm.reason.trim(),
        refund_amount: Number(cancelForm.refund_amount) || 0,
      });
      await queryClient.invalidateQueries({ queryKey: ["contracts"] });
      setCancelDraft(null);
    } catch (err) {
      showError(err, "Error al cancelar el contrato");
    } finally {
      setCancelling(false);
    }
  };
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const clientAppQueries = useQueries({
    queries: clients.map((client) => ({
      queryKey: ["client-apps", String(client.id)],
      queryFn: () => clientService.getApps(client.id),
      staleTime: 60_000,
    })),
  });
  const clientAppsById = new Map(
    clients.map((client, index) => [
      String(client.id),
      clientAppQueries[index]?.data?.apps ?? [],
    ])
  );
  const clientAssignmentsLoading = clientAppQueries.some((queryResult) => queryResult.isPending);
  const clientAssignmentsError = clientAppQueries.some((queryResult) => queryResult.isError);
  const landsClients = clients.filter((client) => clientAppsById.get(String(client.id))?.includes("lands"));

  const filtered = useMemo(
    () => landsClients.filter((c) => {
      const matchesFilter = filter === "all" || c.type === filter;
      const matchesSearch = `${c.name} ${c.email || ""}`.toLowerCase().includes(search.toLowerCase());
      return matchesFilter && matchesSearch;
    }),
    [landsClients, filter, search]
  );

  const selected = landsClients.find((c) => c.id === selectedClientId) || filtered[0] || null;
  const withApps = (client) => client ? { ...client, apps: clientAppsById.get(String(client.id)) ?? [] } : null;
  const eco = selected ? getClientEcosystem(withApps(selected)) : null;

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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              {/* min-width:0 para que el subtítulo ceda ancho y el botón no se
                  parta en dos líneas. */}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: ".87rem" }}>Clientes</div>
                <div style={{ fontSize: ".58rem", color: "var(--mu)", fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", marginTop: 1 }}>Del ecosistema · con acceso a Lands</div>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <Button
                  variant="primary"
                  style={{ padding: "6px 12px", fontSize: ".74rem", whiteSpace: "nowrap" }}
                  onClick={() => openModal("clientModal")}
                >
                  + Agregar cliente
                </Button>
              </div>
            </div>
            <div className="cl-src">
              <span style={{ color: "var(--mu)" }}><HiMagnifyingGlass /></span>
              <input type="text" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="cl-filters">
            {[["all","Todos"],["buyer","Compradores"],["tenant","Arrendatarios"],["lead","Prospectos"]].map(([v, l]) => (
              <div key={v} className={`cl-fp ${filter === v ? "act" : ""}`} onClick={() => setFilter(v)}>{l}</div>
            ))}
          </div>
          <div className="cl-list-body">
            {clientsLoading ? (
              <SkeletonRows rows={6} />
            ) : clients.length === 0 ? (
              <EmptyState
                icon={<HiUserGroup />}
                title="Aún no tienes clientes"
                description="Da de alta tu primer cliente para gestionar sus contratos, pagos y documentos."
                ctaLabel="Nuevo cliente"
                onCta={() => { setEditingClient(null); openModal("clientModal"); }}
              />
            ) : filtered.length === 0 ? (
              <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--mu)", fontSize: ".8rem" }}>
                Sin resultados para tu búsqueda.
              </div>
            ) : (
              <>
            {filtered.map((client) => {
              const cEco = getClientEcosystem(withApps(client));
              return (
                <div key={client.id} className={`cl-item ${selected?.id === client.id ? "act" : ""}`} onClick={() => setSelectedClientId(client.id)}>
                  <div className="cl-av">
                    {client.initials || client.name?.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="cl-info">
                    <div className="cl-name">{client.name}</div>
                    <div className="cl-sub">{client.email || client.phone || "Sin contacto"}</div>
                    {cEco.multiApp && (
                      <div className="cl-eco-dots" title={`También en ${cEco.otherApps.map((a) => a.short).join(", ")}`}>
                        {CORE_APPS.filter((a) => cEco.apps[a.key]).map((a) => (
                          <span key={a.key} style={{ width: 7, height: 7, borderRadius: "50%", background: a.color }} />
                        ))}
                        <span>multi-app</span>
                      </div>
                    )}
                  </div>
                  <div className="cl-type-chip chip ch-lo" style={{ background: `${TYPE_COLOR[client.type]}18`, color: TYPE_COLOR[client.type], border: `1px solid ${TYPE_COLOR[client.type]}30` }}>
                    {TYPE_LABEL[client.type] || client.type}
                  </div>
                </div>
              );
            })}
            {clientAssignmentsLoading && (
              <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--mu)", fontSize: ".8rem" }}>
                Consultando accesos de clientes...
              </div>
            )}
            {!clientAssignmentsLoading && clientAssignmentsError && (
              <div style={{ padding: "24px 16px", textAlign: "center", color: "#C0392B", fontSize: ".8rem" }}>
                No se pudieron consultar los accesos de clientes.
              </div>
            )}
            {!clientAssignmentsLoading && !clientAssignmentsError && landsClients.length === 0 && (
              <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--mu)", fontSize: ".8rem" }}>
                Sin clientes vinculados a Lands.
              </div>
            )}
              </>
            )}
          </div>
        </div>

        {/* ── RIGHT: client detail ── */}
        <div className="cl-det-card">
          {selected ? (
            <>
              {/* Header */}
              <div className="cl-det-hd">
                <div className="cl-det-av">
                  {selected.initials || selected.name?.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="cl-det-nm">{selected.name}</div>
                  <div className="cl-det-sub">
                    {selected.email || "Sin correo"}{selected.phone ? ` · ${selected.phone}` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <a href={`tel:${selected.phone}`} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 10, border: "1.5px solid #DCDAD2", background: "#fff", fontSize: "1rem", cursor: "pointer", textDecoration: "none" }}><HiPhone /></a>
                  <a href={`mailto:${selected.email}`} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 10, border: "1.5px solid #DCDAD2", background: "#fff", fontSize: "1rem", cursor: "pointer", textDecoration: "none" }}><HiEnvelope /></a>
                  <a href={`https://wa.me/${(selected.phone || "").replace(/\D/g,"")}`} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 10, border: "1.5px solid #DCDAD2", background: "#fff", fontSize: "1rem", cursor: "pointer", textDecoration: "none" }}><HiChatBubbleLeftRight /></a>
                  <Button variant="secondary" style={{ padding: "6px 14px", fontSize: ".76rem" }} onClick={() => { setEditingClient(selected); openModal("clientModal"); }}>
                    Editar
                  </Button>
                </div>
              </div>

              <div className="cl-det-body">
                {/* Identidad del ecosistema (core) */}
                {eco && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", background: "rgba(111,175,107,.09)", border: "1px solid rgba(111,175,107,.28)", borderRadius: 12, padding: "9px 13px", marginBottom: 14 }}>
                    <span style={{ fontSize: ".72rem", fontWeight: 800, color: "#2F6A38", display: "flex", alignItems: "center", gap: 6 }}>
                      <HiGlobeAlt /> Identidad del ecosistema
                    </span>
                    <span style={{ fontFamily: "var(--font-body)", fontSize: ".64rem", color: "var(--mu)" }}>{eco.coreId}</span>
                    {eco.multiApp && (
                      <span style={{ fontSize: ".68rem", color: "var(--tx2)" }}>
                        · También en {eco.otherApps.map((a) => a.short).join(", ")}
                      </span>
                    )}
                    <button onClick={() => navigate("/ecosistema/clientes")} style={{ marginLeft: "auto", fontSize: ".7rem", fontWeight: 700, color: "var(--forest)", cursor: "pointer", whiteSpace: "nowrap" }}>
                      Gestionar en el core →
                    </button>
                  </div>
                )}

                {/* Seller */}
                {sellerName && (
                  <div className="owner-card">
                    <div className="ow-av" style={{ background: "#1E3D2B" }}>{sellerInitials}</div>
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
                          <tr style={{ borderBottom: "1.5px solid #E7E4DB" }}>
                            {["ID Lote", "Proyecto", "Estado", "Medidas", "Progreso", ""].map((h) => (
                              <th key={h} style={{ textAlign: "left", padding: "5px 8px", fontSize: ".6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#83867C", whiteSpace: "nowrap" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {clientContracts.map((contract) => {
                            const lot = contract.lot;
                            const prog = paidCountByContract[String(contract.id)];
                            const lotStatus = lot?.lot_status || (contract.type === "reserve" ? "reserved" : "sold");
                            const statusLabel = LOT_STATUS_LABEL[lotStatus] || lotStatus;
                            const statusColor = LOT_STATUS_COLOR[lotStatus] || "#83867C";
                            return (
                              <tr key={contract.id} style={{ borderBottom: "1px solid #EDEAE1" }}>
                                <td style={{ padding: "7px 8px", fontWeight: 700, color: "#1E3D2B" }}>{lot?.code || "—"}</td>
                                <td style={{ padding: "7px 8px", color: "#43453F" }}>{lot?.inmueble_name || "—"}</td>
                                <td style={{ padding: "7px 8px" }}>
                                  <span style={{ background: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}30`, borderRadius: 6, padding: "2px 8px", fontSize: ".65rem", fontWeight: 700 }}>
                                    {statusLabel}
                                  </span>
                                </td>
                                <td style={{ padding: "7px 8px", color: "#43453F" }}>
                                  {lot?.area_m2 ? `${lot.area_m2} m²` : "—"}
                                </td>
                                <td style={{ padding: "7px 8px", color: "#43453F" }}>
                                  {prog
                                    ? `${contract.type === "reserve" ? "Enganche" : "Pagos"} (${prog.paid}/${prog.total} cuotas)`
                                    : CONTRACT_STATUS_LABEL[contract.status] || contract.status}
                                </td>
                                <td style={{ padding: "7px 8px" }}>
                                  {contract.status === "active" && (
                                    <button
                                      onClick={() => openCancelModal(contract)}
                                      style={{ fontSize: ".65rem", fontWeight: 700, color: "#C0392B", background: "#fee2e220", border: "1px solid #fca5a5", borderRadius: 6, padding: "2px 8px", cursor: "pointer", whiteSpace: "nowrap" }}
                                    >
                                      Cancelar
                                    </button>
                                  )}
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
                  <Button variant="primary" style={{ padding: "8px 15px", fontSize: ".78rem" }} onClick={() => openContractCreate({ clientId: selected.id })}>
                    <HiDocumentText /> Nuevo Contrato
                  </Button>
                  {selected.type === "lead" && (
                    <Button variant="primary" style={{ padding: "8px 15px", fontSize: ".78rem" }} onClick={() => openContractCreate({ clientId: selected.id, type: "reserve" })}>
                      <HiLockClosed /> Registrar Apartado
                    </Button>
                  )}
                  {selected.type !== "lead" && (
                    <Button variant="primary" style={{ padding: "8px 15px", fontSize: ".78rem" }} onClick={() => openClientReport(selected.id)}>
                      <HiPrinter /> Estado de Cuenta
                    </Button>
                  )}
                </div>

                <InlineDocumentsPanel entityType="client" entityId={selected.id} entityLabel={selected.name} />
              </div>
            </>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 12, color: "var(--mu)", padding: 40, textAlign: "center" }}>
              <div style={{ fontSize: "2.8rem", opacity: 0.18 }}><HiUser /></div>
              <div style={{ fontFamily: "var(--font-title)", fontSize: "1rem", color: "var(--tx)", opacity: 0.35 }}>Selecciona un cliente</div>
              <div style={{ fontSize: ".78rem", maxWidth: 190, lineHeight: 1.5 }}>Elige un cliente de la lista para ver su expediente completo</div>
            </div>
          )}
        </div>
      </div>

      {cancelDraft && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => !cancelling && setCancelDraft(null)}
        >
          <div style={{ background: "#fff", borderRadius: 16, width: "min(92vw, 440px)", boxShadow: "0 24px 60px rgba(0,0,0,.22)", overflow: "hidden" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderBottom: "1px solid #EDEAE1" }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: "#fee2e2", color: "#991b1b", border: "1.5px solid #fca5a5", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "1rem", flexShrink: 0 }}>!</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: ".9rem", color: "#1E3D2B" }}>Cancelar contrato</div>
                <div style={{ fontSize: ".72rem", color: "#83867C" }}>Lote {cancelDraft.contract.lot?.code || "—"} · {cancelDraft.contract.lot?.inmueble_name || "—"}</div>
              </div>
              <button onClick={() => setCancelDraft(null)} style={{ marginLeft: "auto", background: "none", border: "none", fontSize: "1.3rem", color: "#83867C", cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>
            {/* Body */}
            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 14 }}>
              <p style={{ fontSize: ".82rem", color: "#43453F", lineHeight: 1.6, margin: 0 }}>
                Esta acción cancelará el contrato activo, liberará el lote y cancelará los pagos pendientes. No se puede deshacer.
              </p>
              <div>
                <label style={{ display: "block", fontSize: ".68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#83867C", marginBottom: 5 }}>Motivo de cancelación *</label>
                <textarea
                  rows={2}
                  value={cancelForm.reason}
                  onChange={(e) => setCancelForm((p) => ({ ...p, reason: e.target.value }))}
                  placeholder="Ej: Solicitud del cliente, incumplimiento de pago..."
                  style={{ width: "100%", borderRadius: 8, border: "1.5px solid #DCDAD2", padding: "8px 10px", fontSize: ".82rem", color: "#1E3D2B", outline: "none", fontFamily: "var(--font-body)", resize: "none", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: ".68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#83867C", marginBottom: 5 }}>Monto de reembolso ($) <span style={{ fontWeight: 400, textTransform: "none" }}>— opcional</span></label>
                <input
                  type="number"
                  min="0"
                  value={cancelForm.refund_amount}
                  onChange={(e) => setCancelForm((p) => ({ ...p, refund_amount: e.target.value }))}
                  placeholder="0"
                  style={{ width: "100%", borderRadius: 8, border: "1.5px solid #DCDAD2", padding: "8px 10px", fontSize: ".82rem", color: "#1E3D2B", outline: "none", fontFamily: "var(--font-body)", boxSizing: "border-box" }}
                />
              </div>
            </div>
            {/* Footer */}
            <div style={{ display: "flex", gap: 8, padding: "14px 20px", borderTop: "1px solid #EDEAE1", justifyContent: "flex-end" }}>
              <button onClick={() => setCancelDraft(null)} disabled={cancelling}
                style={{ borderRadius: 8, border: "1.5px solid #DCDAD2", background: "#F1EEE6", color: "#43453F", padding: "7px 16px", fontSize: ".78rem", fontWeight: 700, cursor: "pointer" }}>
                Cerrar
              </button>
              <button onClick={submitCancel} disabled={cancelling || !cancelForm.reason.trim()}
                style={{ borderRadius: 8, border: "1.5px solid #991b1b", background: "#C0392B", color: "#fff", padding: "7px 16px", fontSize: ".78rem", fontWeight: 700, cursor: "pointer", opacity: (!cancelForm.reason.trim() || cancelling) ? 0.5 : 1 }}>
                {cancelling ? "Cancelando..." : "Confirmar cancelación"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ClientModal />
      <GuideModal
        open={showGuide}
        onClose={() => setShowGuide(false)}
        title="Directorio de clientes"
        subtitle="Seguimiento de compradores, prospectos y sus contratos activos."
        steps={[
          { title: "Seleccionar un cliente", text: "Haz clic en cualquier cliente de la lista izquierda para ver su detalle completo: contratos, pagos, saldo y documentos vinculados." },
          { title: "Buscar y filtrar", text: "Usa la barra de búsqueda para encontrar clientes por nombre o correo. El filtro de pestañas separa compradores activos de prospectos." },
          { title: "Agregar un cliente", text: "El botón '+ Agregar cliente' abre el formulario para registrarlo y darle acceso a OwnTerra Lands. Si el correo ya existe en el ecosistema, se vincula esa identidad en vez de duplicarla." },
          { title: "Editar cliente", text: "En el detalle del cliente, el botón 'Editar' permite modificar nombre, correo, teléfono y datos del contrato." },
          { title: "Estado de cuenta", text: "Desde el detalle puedes ver el historial de pagos, descargarlo en PDF o enviarlo por correo directamente al cliente." },
          { title: "Contacto rápido", text: "Los íconos de teléfono, correo y WhatsApp en el encabezado del cliente abren directamente la app de contacto correspondiente." },
        ]}
      />
    </>
  );
}

export default ClientsPage;
