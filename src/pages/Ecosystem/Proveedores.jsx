import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import EcoLayout from "./EcoLayout";
import { SkeletonRows } from "@/components/ui/Skeleton";
import InlineError from "@/components/shared/InlineError";
import FieldError from "@/components/shared/FieldError";
import PhoneInput from "@/components/shared/PhoneInput";
import { useFieldErrors } from "@/hooks/useFieldErrors";
import { providerService } from "@/services/providerService";
import { useAppContext } from "@/context/AppContext";
import { parseApiError } from "@/errors/parseApiError";
import useEscapeKey from "@/hooks/useEscapeKey";

const blankDraft = { name: "", categoria: "", tax_id: "", phone: "", notes: "" };
const initials = (name = "") => name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

function EcosystemProveedores() {
  const qc = useQueryClient();
  const { showToast, showError } = useAppContext();
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [modal, setModal] = useState(null);
  const [formError, setFormError] = useState(null);
  useEscapeKey(() => setModal(null), Boolean(modal));
  const fe = useFieldErrors();

  const { data, isLoading } = useQuery({
    queryKey: ["providers", "eco-providers", showArchived],
    queryFn: () => providerService.list({ limit: 100, is_archived: showArchived }),
  });
  const providers = data?.items ?? [];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return providers;
    return providers.filter((p) => p.name.toLowerCase().includes(q) || (p.categoria || "").toLowerCase().includes(q));
  }, [providers, query]);
  const selected = filtered.find((p) => String(p.id) === String(selectedId)) || filtered[0] || null;

  const createMutation = useMutation({
    mutationFn: (draft) => providerService.create({
      name: draft.name,
      categoria: draft.categoria || undefined,
      tax_id: draft.tax_id || undefined,
      phone: draft.phone || undefined,
      notes: draft.notes || undefined,
    }),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["providers"] });
      setSelectedId(String(created.id));
      setModal(null);
      setFormError(null);
      showToast("Proveedor registrado");
    },
    onError: (err) => setFormError(parseApiError(err, "Error al registrar el proveedor")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => providerService.update(id, body),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["providers"] });
      setSelectedId(String(updated.id));
      setModal(null);
      setFormError(null);
      showToast("Proveedor actualizado");
    },
    onError: (err) => setFormError(parseApiError(err, "Error al actualizar el proveedor")),
  });

  const archiveMutation = useMutation({
    mutationFn: (id) => providerService.archive(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["providers"] });
      setSelectedId(null);
      showToast("Proveedor dado de baja");
    },
    onError: (err) => showError(err, "Error al dar de baja al proveedor"),
  });

  const openCreate = () => {
    setFormError(null);
    fe.clearAll();
    setModal({ mode: "create", draft: blankDraft });
  };
  const openEdit = (provider) => {
    setFormError(null);
    fe.clearAll();
    setModal({
      mode: "edit",
      providerId: provider.id,
      draft: {
        name: provider.name || "",
        categoria: provider.categoria || "",
        tax_id: provider.tax_id || "",
        phone: provider.phone || "",
        notes: provider.notes || "",
      },
    });
  };
  const setDraft = (patch) => setModal((m) => ({ ...m, draft: { ...m.draft, ...patch } }));

  const saveDraft = () => {
    const draft = modal.draft;
    setFormError(null);
    fe.clearAll();
    if (!draft.name.trim()) { fe.setErrors({ name: "El nombre es obligatorio." }); return; }
    if (modal.mode === "create") {
      createMutation.mutate(draft);
      return;
    }
    updateMutation.mutate({
      id: modal.providerId,
      body: {
        name: draft.name,
        categoria: draft.categoria || null,
        tax_id: draft.tax_id || null,
        phone: draft.phone || null,
        notes: draft.notes || null,
      },
    });
  };

  if (isLoading) {
    return (
      <EcoLayout active="providers" title="Proveedores" subtitle="Materiales, subcontratas y terceros a quienes la org paga">
        <SkeletonRows rows={5} />
      </EcoLayout>
    );
  }

  return (
    <EcoLayout active="providers" title="Proveedores" subtitle="Materiales, subcontratas y terceros a quienes la org paga">
      <div className="ag-hero">
        <div>
          <div className="ag-kicker">Ecosistema Core</div>
          <h2>Proveedores</h2>
          <p>Materiales, subcontratistas y terceros externos. Igual que Personal: se registran para presupuesto y pagos — <b>nunca tienen usuario ni acceso a la app</b>.</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="ag-primary" onClick={openCreate}>Nuevo proveedor</button>
        </div>
      </div>

      <div className="usr-layout" style={{ marginTop: 16 }}>
        <div className="usr-card">
          <div className="usr-list-head">
            <div className="usr-list-title">Proveedores ({filtered.length})</div>
            <label className="usr-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input placeholder="Buscar por nombre o categoría..." value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
            <div className="usr-fil-row" style={{ marginTop: 12, marginBottom: 0 }}>
              <button className={`usr-fil ${!showArchived ? "on" : ""}`} onClick={() => setShowArchived(false)}>Activos</button>
              <button className={`usr-fil ${showArchived ? "on" : ""}`} onClick={() => setShowArchived(true)}>Dados de baja</button>
            </div>
          </div>
          <div className="usr-list">
            {filtered.map((p) => (
              <button key={p.id} className={`usr-item ${String(p.id) === String(selected?.id) ? "active" : ""}`} onClick={() => setSelectedId(String(p.id))}>
                <span className="usr-av">{p.initials || initials(p.name)}</span>
                <span className="usr-info">
                  <span className="usr-name" style={{ display: "block" }}>{p.name}</span>
                  <span className="usr-mail" style={{ display: "block" }}>{p.categoria || "Sin categoría"}</span>
                </span>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="usr-empty">{showArchived ? "No hay proveedores dados de baja." : "Aún no hay proveedores registrados."}</div>
            )}
          </div>
        </div>

        <div className="usr-card">
          {!selected ? (
            <div className="usr-empty">Registra un proveedor para empezar a asignarle presupuesto y pagos.</div>
          ) : (
            <>
              <div className="usr-d-head">
                <span className="usr-d-av">{selected.initials || initials(selected.name)}</span>
                <div style={{ minWidth: 0 }}>
                  <div className="usr-d-name">{selected.name}</div>
                  <div className="usr-d-meta">{selected.categoria || "Sin categoría"} · {selected.phone || "sin teléfono"}{selected.tax_id ? ` · ${selected.tax_id}` : ""}</div>
                </div>
              </div>
              <div className="usr-d-body">
                <div className="usr-d-intro">
                  Este proveedor vive en el <b>Core</b> como registro de terceros — sin usuario ni contraseña. Opera fuera del software, nunca dentro.
                </div>
                {selected.notes && (
                  <div className="usr-access-note" style={{ marginTop: 8 }}>{selected.notes}</div>
                )}
                <div className="usr-list-bar" style={{ marginTop: 18 }}>
                  {!showArchived && (
                    <>
                      <button className="usr-add-btn" onClick={() => openEdit(selected)}>Editar proveedor</button>
                      <button
                        className="usr-btn-ghost"
                        disabled={archiveMutation.isPending}
                        onClick={() => archiveMutation.mutate(selected.id)}
                      >
                        {archiveMutation.isPending ? "Dando de baja..." : "Dar de baja"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {modal && (
        <div className="usr-modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="usr-modal">
            <div className="usr-modal-head">
              <div>
                <div className="usr-modal-title">{modal.mode === "create" ? "Nuevo proveedor" : "Editar proveedor"}</div>
                <div className="usr-modal-sub">Registro de terceros en el Core — sin usuario ni acceso a ninguna app.</div>
              </div>
              <button className="usr-modal-close" onClick={() => setModal(null)}>x</button>
            </div>
            <div className="usr-modal-body">
              <InlineError error={formError} onDismiss={() => setFormError(null)} />
              <div className="usr-field-row">
                <div className="usr-field">
                  <label className="usr-field-lbl">Nombre</label>
                  <input {...fe.fieldProps("name", "usr-input")} value={modal.draft.name} onChange={(e) => { setDraft({ name: e.target.value }); fe.clear("name"); }} />
                  <FieldError msg={fe.errors.name} />
                </div>
                <div className="usr-field">
                  <label className="usr-field-lbl">Categoría</label>
                  <input className="usr-input" placeholder="Materiales, mano de obra externa, terreno..." value={modal.draft.categoria} onChange={(e) => setDraft({ categoria: e.target.value })} />
                </div>
              </div>
              <div className="usr-field-row">
                <div className="usr-field">
                  <label className="usr-field-lbl">RFC</label>
                  <input className="usr-input" value={modal.draft.tax_id} onChange={(e) => setDraft({ tax_id: e.target.value })} />
                </div>
                <div className="usr-field">
                  <label className="usr-field-lbl">Teléfono</label>
                  <PhoneInput inputClassName="usr-input" value={modal.draft.phone} onChange={(v) => setDraft({ phone: v })} />
                </div>
              </div>
              <div className="usr-field">
                <label className="usr-field-lbl">Notas</label>
                <input className="usr-input" value={modal.draft.notes} onChange={(e) => setDraft({ notes: e.target.value })} />
              </div>
            </div>
            <div className="usr-modal-foot">
              <button className="usr-btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
              <button className="usr-btn-primary" onClick={saveDraft} disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </EcoLayout>
  );
}

export default EcosystemProveedores;
