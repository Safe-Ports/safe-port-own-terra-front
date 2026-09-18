import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HiArchiveBox, HiBuildingStorefront, HiMagnifyingGlass, HiPencilSquare, HiPlus, HiSquares2X2 } from "react-icons/hi2";
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
import { PROVIDER_TYPES, normalizeProviderType, providerSearchText, providerTypeMeta } from "./providerCatalog";
import "@/styles/provider-directory.css";

const blankDraft = { name: "", categoria: "servicios", tax_id: "", phone: "", notes: "" };
const initials = (name = "") => name.split(" ").filter(Boolean).map((part) => part[0]).slice(0, 2).join("").toUpperCase();

function EcosystemProveedores() {
  const queryClient = useQueryClient();
  const { showToast, showError } = useAppContext();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [modal, setModal] = useState(null);
  const [formError, setFormError] = useState(null);
  const fieldErrors = useFieldErrors();
  useEscapeKey(() => setModal(null), Boolean(modal));

  const providersQuery = useQuery({ queryKey: ["providers", "ecosystem-directory", showArchived], queryFn: () => providerService.list({ limit: 100, is_archived: showArchived }) });
  const providers = providersQuery.data?.items ?? [];
  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return providers.filter((provider) => (typeFilter === "all" || normalizeProviderType(provider.categoria) === typeFilter) && (!search || providerSearchText(provider).includes(search)));
  }, [providers, query, typeFilter]);
  const selected = filtered.find((provider) => String(provider.id) === String(selectedId)) || filtered[0] || null;
  const representedTypes = new Set(providers.map((provider) => normalizeProviderType(provider.categoria))).size;

  const finishMutation = (message, saved) => {
    queryClient.invalidateQueries({ queryKey: ["providers"] });
    if (saved?.id) setSelectedId(String(saved.id));
    setModal(null); setFormError(null); showToast(message);
  };
  const createMutation = useMutation({
    mutationFn: (draft) => providerService.create({ name: draft.name.trim(), categoria: draft.categoria, tax_id: draft.tax_id || undefined, phone: draft.phone || undefined, notes: draft.notes || undefined }),
    onSuccess: (saved) => finishMutation("Proveedor registrado en el Ecosistema", saved),
    onError: (error) => setFormError(parseApiError(error, "Error al registrar el proveedor")),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => providerService.update(id, body),
    onSuccess: (saved) => finishMutation("Proveedor actualizado", saved),
    onError: (error) => setFormError(parseApiError(error, "Error al actualizar el proveedor")),
  });
  const archiveMutation = useMutation({
    mutationFn: (id) => providerService.archive(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["providers"] }); setSelectedId(null); showToast("Proveedor dado de baja"); },
    onError: (error) => showError(error, "Error al dar de baja al proveedor"),
  });

  const openCreate = () => { setFormError(null); fieldErrors.clearAll(); setModal({ mode: "create", draft: { ...blankDraft } }); };
  const openEdit = (provider) => { setFormError(null); fieldErrors.clearAll(); setModal({ mode: "edit", providerId: provider.id, draft: { name: provider.name || "", categoria: normalizeProviderType(provider.categoria), tax_id: provider.tax_id || "", phone: provider.phone || "", notes: provider.notes || "" } }); };
  const setDraft = (patch) => setModal((current) => ({ ...current, draft: { ...current.draft, ...patch } }));
  const saveDraft = () => {
    fieldErrors.clearAll(); setFormError(null);
    if (!modal.draft.name.trim()) { fieldErrors.setErrors({ name: "El nombre o razón social es obligatorio." }); return; }
    if (modal.mode === "create") { createMutation.mutate(modal.draft); return; }
    updateMutation.mutate({ id: modal.providerId, body: { name: modal.draft.name.trim(), categoria: modal.draft.categoria, tax_id: modal.draft.tax_id || null, phone: modal.draft.phone || null, notes: modal.draft.notes || null } });
  };
  const pending = createMutation.isPending || updateMutation.isPending;

  return <EcoLayout active="providers" title="Proveedores" subtitle="Directorio compartido por todo el Ecosistema">
    <main className="provider-page">
      <section className="provider-hero"><div><span>OWN TERRA CORE</span><h1>Una sola red de proveedores.</h1><p>Registra empresas y profesionales una vez; después asígnalos a Lands, Properties, Construction o cualquier operación de la organización.</p></div><button type="button" onClick={openCreate}><HiPlus /> Nuevo proveedor</button></section>

      <section className="provider-kpis" aria-label="Resumen del directorio">
        <article><HiBuildingStorefront /><span><small>Proveedores {showArchived ? "archivados" : "activos"}</small><strong>{providers.length}</strong></span></article>
        <article><HiSquares2X2 /><span><small>Tipos representados</small><strong>{representedTypes}</strong></span></article>
        <article><HiArchiveBox /><span><small>Alta</small><strong>Directa</strong><em>La invitación no es obligatoria</em></span></article>
      </section>

      <section className="provider-toolbar">
        <label><HiMagnifyingGlass /><input aria-label="Buscar proveedores" placeholder="Buscar por nombre, RFC, teléfono o notas" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <select aria-label="Filtrar por tipo" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="all">Todos los tipos</option>{PROVIDER_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select>
        <div><button type="button" className={!showArchived ? "active" : ""} onClick={() => setShowArchived(false)}>Activos</button><button type="button" className={showArchived ? "active" : ""} onClick={() => setShowArchived(true)}>Dados de baja</button></div>
      </section>

      {providersQuery.isLoading ? <section className="provider-state"><SkeletonRows rows={5} /></section> : null}
      {providersQuery.isError ? <section className="provider-state"><InlineError error={parseApiError(providersQuery.error, "No pudimos cargar el directorio de proveedores")} /><button type="button" onClick={() => providersQuery.refetch()}>Reintentar</button></section> : null}
      {!providersQuery.isLoading && !providersQuery.isError ? <section className="provider-workspace">
        <div className="provider-list"><header><strong>{filtered.length} proveedores</strong><span>Catálogo de la organización</span></header>
          {filtered.map((provider) => { const meta = providerTypeMeta(provider.categoria); return <button type="button" key={provider.id} className={String(provider.id) === String(selected?.id) ? "active" : ""} onClick={() => setSelectedId(String(provider.id))}><i>{initials(provider.name)}</i><span><strong>{provider.name}</strong><small>{meta.label}</small></span><em>{showArchived ? "Baja" : "Activo"}</em></button>; })}
          {!filtered.length ? <div className="provider-empty"><HiBuildingStorefront /><strong>No encontramos proveedores</strong><p>Ajusta los filtros o registra el primero directamente.</p><button type="button" onClick={openCreate}>Registrar proveedor</button></div> : null}
        </div>
        <article className="provider-detail">{selected ? <>
          <header><i>{initials(selected.name)}</i><div><span>{providerTypeMeta(selected.categoria).label}</span><h2>{selected.name}</h2><p>{selected.tax_id || "RFC sin registrar"} · {selected.phone || "Teléfono sin registrar"}</p></div>{!showArchived ? <button type="button" onClick={() => openEdit(selected)}><HiPencilSquare /> Editar</button> : null}</header>
          <div className="provider-role"><span>REGISTRO CORE</span><h3>Disponible para todas las verticales</h3><p>Este proveedor pertenece a la organización, no a una app específica. Darlo de alta no crea un usuario ni le concede acceso.</p><div><b>Lands</b><b>Properties</b><b>Construction</b></div></div>
          <dl><div><dt>Tipo de proveedor</dt><dd>{providerTypeMeta(selected.categoria).label}</dd></div><div><dt>Forma de alta</dt><dd>Registro directo</dd></div><div><dt>Acceso a Own Terra</dt><dd>Sin acceso</dd></div><div><dt>Estado</dt><dd>{showArchived ? "Dado de baja" : "Activo"}</dd></div></dl>
          <section><span>Notas operativas</span><p>{selected.notes || "Todavía no hay notas para este proveedor."}</p></section>
          {!showArchived ? <footer><button type="button" onClick={() => archiveMutation.mutate(selected.id)} disabled={archiveMutation.isPending}><HiArchiveBox /> {archiveMutation.isPending ? "Dando de baja…" : "Dar de baja"}</button><small>Invitarlo a un portal será una acción separada cuando necesite colaborar en una orden.</small></footer> : null}
        </> : <div className="provider-empty"><HiBuildingStorefront /><strong>Selecciona un proveedor</strong><p>Aquí verás su clasificación y alcance dentro del Ecosistema.</p></div>}</article>
      </section> : null}
    </main>

    {modal ? <div className="provider-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setModal(null)}><div className="provider-modal" role="dialog" aria-modal="true" aria-labelledby="provider-modal-title">
      <header><div><span>CATÁLOGO DEL ECOSISTEMA</span><h2 id="provider-modal-title">{modal.mode === "create" ? "Nuevo proveedor" : "Editar proveedor"}</h2><p>Se registra directamente. No necesita correo ni invitación para existir en el catálogo.</p></div><button type="button" aria-label="Cerrar" onClick={() => setModal(null)}>×</button></header>
      <div className="provider-modal-body"><InlineError error={formError} onDismiss={() => setFormError(null)} />
        <label className="wide"><span>Nombre o razón social *</span><input {...fieldErrors.fieldProps("name")} value={modal.draft.name} onChange={(event) => { setDraft({ name: event.target.value }); fieldErrors.clear("name"); }} placeholder="Ej. Hidráulica del Centro" /><FieldError msg={fieldErrors.errors.name} /></label>
        <label><span>Tipo de proveedor *</span><select value={modal.draft.categoria} onChange={(event) => setDraft({ categoria: event.target.value })}>{PROVIDER_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select><small>{providerTypeMeta(modal.draft.categoria).description}</small></label>
        <label><span>RFC</span><input value={modal.draft.tax_id} onChange={(event) => setDraft({ tax_id: event.target.value.toUpperCase() })} placeholder="Opcional" /></label>
        <label><span>Teléfono</span><PhoneInput inputClassName="provider-phone" value={modal.draft.phone} onChange={(phone) => setDraft({ phone })} /></label>
        <label className="wide"><span>Notas operativas</span><textarea rows="3" value={modal.draft.notes} onChange={(event) => setDraft({ notes: event.target.value })} placeholder="Especialidad, cobertura, contacto o condiciones relevantes" /></label>
      </div>
      <footer><p>Podrás asignarlo a obras, servicios o mantenimientos después.</p><div><button type="button" onClick={() => setModal(null)}>Cancelar</button><button type="button" onClick={saveDraft} disabled={pending}>{pending ? "Guardando…" : "Guardar proveedor"}</button></div></footer>
    </div></div> : null}
  </EcoLayout>;
}

export default EcosystemProveedores;
