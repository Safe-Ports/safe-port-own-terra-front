import WorkflowForm from "@/components/forms/WorkflowForm";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HiExclamationTriangle, HiArrowRight, HiBuildingOffice2, HiCheckBadge, HiLink, HiPhone, HiPlus, HiShieldCheck, HiUserGroup, HiWrenchScrewdriver } from "react-icons/hi2";
import { useNavigate } from "react-router-dom";
import EcoLayout from "@/pages/Ecosystem/EcoLayout";
import Modal from "@/components/ui/Modal";
import FieldError from "@/components/shared/FieldError";
import InlineError from "@/components/shared/InlineError";
import { parseApiError } from "@/errors/parseApiError";
import { useAppContext } from "@/context/AppContext";
import { providerService } from "@/services/providerService";
import { usePropertiesData } from "../../data/PropertiesDataContext";
import "./service-network.css";

const STATUS_LABEL = { pending: "Pendiente", active: "Activo", suspended: "Suspendido", archived: "Archivado" };
const KIND_LABEL = { independent: "Profesional independiente", company: "Empresa proveedora" };
const ROLE_LABEL = { independent: "Independiente", coordinator: "Coordinador", technician: "Técnico" };

const emptyEnable = { coreProviderId: "", name: "", kind: "independent", specialtyIds: [], description: "", declaredAvailability: "" };
const emptyContact = { name: "", email: "", phone: "", role: "technician", invitationMode: "permanent" };

function ServiceNetworkPage() {
  const navigate = useNavigate();
  const { showToast, canUseFeature } = useAppContext();
  const canManage = canUseFeature("properties.providers.manage");
  const canApprove = canUseFeature("properties.providers.approve");
  const canInvite = canUseFeature("properties.providers.invite");
  const {
    serviceProviders, serviceSpecialties, serviceApplications, serviceEnrollmentLinks,
    serviceNetworkLoading, serviceNetworkError, retryServiceNetwork,
    enableServiceProvider, suspendServiceProvider, reactivateServiceProvider, archiveServiceProvider,
    getServiceProviderContacts, addServiceProviderContact, inviteServiceContact, revokeServiceContactInvite,
    createServiceEnrollmentLink, approveServiceApplication, rejectServiceApplication,
  } = usePropertiesData();

  const [filter, setFilter] = useState("all");
  const [directoryQuery, setDirectoryQuery] = useState("");
  const [actionError, setActionError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [enrollmentUrl, setEnrollmentUrl] = useState("");
  const [copyNotice, setCopyNotice] = useState("");
  const [contactsError, setContactsError] = useState(null);
  const [coreError, setCoreError] = useState(null);
  const [approveError, setApproveError] = useState(null);
  const contactsRequest = useRef(0);
  const coreRequest = useRef(0);
  const approvalRequest = useRef(0);
  const [selectedId, setSelectedId] = useState(null);
  const [showEnable, setShowEnable] = useState(false);
  const [enableDraft, setEnableDraft] = useState(emptyEnable);
  const [coreQuery, setCoreQuery] = useState("");
  const [coreResults, setCoreResults] = useState([]);
  const [coreSearching, setCoreSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showApplications, setShowApplications] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [contactDraft, setContactDraft] = useState(emptyContact);
  // Suspender, archivar y rechazar piden un motivo que queda en la bitácora:
  // se captura en un diálogo de la app, no en un window.prompt.
  const [reasonAsk, setReasonAsk] = useState(null);
  const [reasonText, setReasonText] = useState("");
  // Aprobar vincula la solicitud con un proveedor del catálogo de Core. Se elige
  // buscándolo por nombre, no pegando su UUID a mano.
  const [approveFor, setApproveFor] = useState(null);
  const [approveQuery, setApproveQuery] = useState("");
  const [approveResults, setApproveResults] = useState([]);
  const [approveSearching, setApproveSearching] = useState(false);
  const [approvePick, setApprovePick] = useState(null);

  const visible = useMemo(() => serviceProviders.filter(item => (filter === "all" || item.kind === filter) && [item.name, item.categoria].some(value => (value || "").toLocaleLowerCase("es-MX").includes(directoryQuery.trim().toLocaleLowerCase("es-MX")))), [filter, directoryQuery, serviceProviders]);
  const selected = visible.find(item => item.id === selectedId) || visible[0] || null;

  const loadContacts = useCallback(async (profileId) => {
    const request = ++contactsRequest.current;
    setContacts([]); setContactsError(null); setContactsLoading(true);
    try { const rows = await getServiceProviderContacts(profileId); if (request === contactsRequest.current) setContacts(rows); }
    catch (error) { if (request === contactsRequest.current) setContactsError(parseApiError(error, "No pudimos cargar los contactos.")); }
    finally { if (request === contactsRequest.current) setContactsLoading(false); }
  }, [getServiceProviderContacts]);

  useEffect(() => {
    if (selected?.id) loadContacts(selected.id);
    else { ++contactsRequest.current; setContacts([]); setContactsError(null); setContactsLoading(false); }
    return () => { ++contactsRequest.current; };
  }, [selected?.id, loadContacts]);

  const selectProvider = (item) => { setSelectedId(item.id); setActionError(null); };
  const openDialog = (event, setter) => { event.currentTarget.focus(); setActionError(null); setFieldErrors({}); setter(true); };

  const searchCore = async (query) => {
    const request = ++coreRequest.current;
    setCoreQuery(query); setCoreError(null); setCoreResults([]);
    setEnableDraft(current => ({ ...current, coreProviderId: "", name: "" }));
    if (!query.trim()) { setCoreSearching(false); return; }
    setCoreSearching(true);
    try { const result = await providerService.list({ search: query, limit: 10 }); if (request === coreRequest.current) setCoreResults(result.items || []); }
    catch (error) { if (request === coreRequest.current) setCoreError(parseApiError(error, "No pudimos buscar en el catálogo de Core.")); }
    finally { if (request === coreRequest.current) setCoreSearching(false); }
  };

  const pickCoreProvider = (provider) => {
    ++coreRequest.current; setCoreSearching(false); setCoreError(null); setFieldErrors({});
    setEnableDraft((current) => ({ ...current, coreProviderId: provider.id, name: provider.name }));
    setCoreResults([]);
    setCoreQuery(provider.name);
  };

  const toggleSpecialty = (id) => setEnableDraft((current) => ({
    ...current,
    specialtyIds: current.specialtyIds.includes(id) ? current.specialtyIds.filter((item) => item !== id) : [...current.specialtyIds, id],
  }));

  const submitEnable = async (event) => {
    event.preventDefault();
    if (!enableDraft.coreProviderId) { setFieldErrors({ coreProviderId: "Busca y selecciona un proveedor del catálogo de Core." }); return; }
    setFieldErrors({}); setActionError(null);
    setBusy(true);
    try {
      await enableServiceProvider(enableDraft);
      showToast("Proveedor habilitado en la red de servicio", "success");
      setShowEnable(false);
      setEnableDraft(emptyEnable);
      setCoreQuery("");
    } catch (error) {
      setActionError(parseApiError(error));
    } finally {
      setBusy(false);
    }
  };

  const submitContact = async (event) => {
    event.preventDefault();
    if (!selected) return;
    const errors = {};
    if (!contactDraft.name.trim()) errors.name = "Escribe el nombre del contacto.";
    if (contactDraft.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactDraft.email.trim())) errors.email = "Escribe un correo válido.";
    setFieldErrors(errors); setActionError(null);
    if (Object.keys(errors).length) return;
    setBusy(true);
    try {
      await addServiceProviderContact(selected.id, { mode: "new", ...contactDraft });
      showToast("Contacto agregado", "success");
      setShowContact(false);
      setContactDraft(emptyContact);
      loadContacts(selected.id);
    } catch (error) {
      setActionError(parseApiError(error));
    } finally {
      setBusy(false);
    }
  };

  const withBusy = (action) => async (...args) => {
    setBusy(true); setActionError(null);
    try { await action(...args); }
    catch (error) { setActionError(parseApiError(error)); }
    finally { setBusy(false); }
  };

  const askReason = (config) => { setActionError(null); setReasonText(""); setReasonAsk(config); };

  const confirmReason = withBusy(async () => {
    const reason = reasonText.trim();
    if (!reason || !reasonAsk) return;
    await reasonAsk.action(reason);
    showToast(reasonAsk.done, "success");
    setReasonAsk(null);
    setReasonText("");
  });

  const searchCoreForApproval = async (query) => {
    const request = ++approvalRequest.current;
    setApproveQuery(query); setApprovePick(null); setApproveError(null); setApproveResults([]);
    if (!query.trim()) { setApproveSearching(false); return; }
    setApproveSearching(true);
    try { const result = await providerService.list({ search: query, limit: 10 }); if (request === approvalRequest.current) setApproveResults(result.items || []); }
    catch (error) { if (request === approvalRequest.current) setApproveError(parseApiError(error, "No pudimos buscar proveedores.")); }
    finally { if (request === approvalRequest.current) setApproveSearching(false); }
  };

  const openApproval = (application) => {
    setActionError(null);
    setApproveFor(application);
    setApproveQuery(application.name || "");
    setApprovePick(null);
    setApproveResults([]);
    if (application.name) searchCoreForApproval(application.name);
  };

  const confirmApproval = withBusy(async () => {
    if (!approveFor || !approvePick) return;
    await approveServiceApplication(approveFor.id, { existing_core_provider_id: approvePick.id });
    showToast("Solicitud aprobada", "success");
    setApproveFor(null);
    setApprovePick(null);
    setApproveQuery("");
    setApproveResults([]);
  });

  const copyLink = async (url = enrollmentUrl) => {
    try { await navigator.clipboard.writeText(url); setCopyNotice("Enlace copiado."); }
    catch { setCopyNotice("No pudimos copiar automáticamente. Selecciona y copia el enlace de abajo."); }
  };
  const createLink = withBusy(async () => {
    const row = await createServiceEnrollmentLink({});
    if (!row.token) throw new Error("El servidor no devolvió el enlace de inscripción.");
    const url = `${window.location.origin}/servicio/registro?token=${encodeURIComponent(row.token)}`;
    setEnrollmentUrl(url); await copyLink(url);
  });

  const rejectApplication = (application) => askReason({
    title: `¿Rechazar la solicitud de ${application.name}?`,
    subtitle: application.folio,
    confirmLabel: "Rechazar solicitud",
    danger: true,
    done: "Solicitud rechazada",
    hint: "El motivo queda registrado y se le comparte al solicitante.",
    action: (reason) => rejectServiceApplication(application.id, reason),
  });

  if (serviceNetworkLoading) return <EcoLayout active="properties" title="Proveedores" subtitle="Operación · Proveedores"><main className="service-page" onClickCapture={event => event.target.closest("button")?.focus()}><p className="service-loading" role="status">Cargando red de servicio…</p></main></EcoLayout>;
  if (serviceNetworkError) return <EcoLayout active="properties" title="Proveedores" subtitle="Operación · Proveedores"><main className="service-page" onClickCapture={event => event.target.closest("button")?.focus()}><section className="service-state"><h1>No pudimos cargar la red de proveedores</h1><InlineError error={parseApiError(serviceNetworkError)} /><button type="button" onClick={retryServiceNetwork}>Reintentar</button></section></main></EcoLayout>;

  return <EcoLayout active="properties" title="Proveedores" subtitle="Operación · Proveedores"><main className="service-page" onClickCapture={event => event.target.closest("button")?.focus()}>
    <header className="service-heading">
      <div><h1>Proveedores</h1><p>Quién resuelve en tus comunidades: perfiles habilitados desde el catálogo de Core, con sus especialidades y sus contactos operativos.</p></div>
      {canManage ? <button type="button" onClick={event => openDialog(event, setShowEnable)}><HiPlus /> Habilitar proveedor</button> : null}
    </header>

    {!showEnable && !showContact && !showApplications && !reasonAsk && !approveFor ? <InlineError error={actionError} /> : null}
    <section className="service-phase-note"><HiShieldCheck /><div><strong>Tu red de proveedores, en un solo lugar</strong><p>Habilita perfiles, especialidades y contactos; comparte el registro y revisa las solicitudes. Las órdenes de mantenimiento y los accesos con QR se incorporarán en la siguiente etapa.</p></div></section>
    <section className="service-access-model">
      <div><HiUserGroup /><span><strong>Equipo interno</strong><small>Reutiliza usuarios y roles del ecosistema.</small></span></div>
      <i />
      <div><HiLink /><span><strong>Proveedor externo</strong><small>Agrega contactos e invítalos desde el perfil del proveedor.</small></span></div>
      <button type="button" onClick={() => navigate("/portal-servicio")}>Vista preliminar del portal <HiArrowRight /></button>
    </section>

    <section className="service-enrollment">
      <div><HiLink /><span><small>Registro autónomo</small><strong>Comparte tu enlace para que los proveedores soliciten acceso.</strong>{serviceEnrollmentLinks[0] ? <em>Vence: {serviceEnrollmentLinks[0].expires_at ? new Date(serviceEnrollmentLinks[0].expires_at).toLocaleDateString("es-MX") : "sin vencimiento"}</em> : <em>Sin enlaces creados todavía.</em>}</span></div>
      {canInvite ? <button type="button" disabled={busy} onClick={createLink}>Generar y copiar enlace</button> : null}
      <i />
      <div><span className="service-request-count">{serviceApplications.length}</span><span><small>Solicitudes pendientes</small><strong>Revisa identidad, especialidad y cobertura antes de aprobar.</strong></span></div>
      {canApprove ? <button type="button" onClick={event => openDialog(event, setShowApplications)}>Revisar solicitudes</button> : null}
    </section>

    {enrollmentUrl ? <section className="service-link-result"><label><span>Enlace público de inscripción</span><input readOnly value={enrollmentUrl} onFocus={event => event.target.select()} /></label><div><button type="button" onClick={() => copyLink()}>Copiar enlace</button><a href={enrollmentUrl} target="_blank" rel="noopener noreferrer">Abrir formulario <HiArrowRight /></a></div><p role="status">{copyNotice}</p><small>Guarda este enlace; el token sólo se entrega cuando se genera. El formulario permite enviar solicitudes sin iniciar sesión.</small></section> : null}

    <section className="service-stats">
      <article><small>Red habilitada</small><strong>{serviceProviders.length}</strong><span>{serviceProviders.filter((item) => item.status === "active").length} activos</span></article>
      <article><small>Solicitudes nuevas</small><strong>{serviceApplications.length}</strong><span>Pendientes de revisión</span></article>
      <article><small>Independientes</small><strong>{serviceProviders.filter((item) => item.kind === "independent").length}</strong><span>En la red</span></article>
      <article><small>Empresas</small><strong>{serviceProviders.filter((item) => item.kind === "company").length}</strong><span>En la red</span></article>
    </section>

    <section className="service-layout">
      <div className="service-directory">
        <header><div><span>Directorio operativo</span><h2>Proveedores</h2></div>
          <nav aria-label="Tipo de proveedor">
            <button type="button" className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>Todos</button>
            <button type="button" className={filter === "independent" ? "active" : ""} onClick={() => setFilter("independent")}>Independientes</button>
            <button type="button" className={filter === "company" ? "active" : ""} onClick={() => setFilter("company")}>Empresas</button>
          </nav>
        </header>
        <label className="service-directory-search"><span>Buscar en la red</span><input value={directoryQuery} onChange={event => setDirectoryQuery(event.target.value)} placeholder="Nombre o categoría" /></label>
        <div>
          {visible.length ? visible.map((item) => (
            <button type="button" aria-pressed={selected?.id === item.id} className={selected?.id === item.id ? "active" : ""} onClick={() => selectProvider(item)} key={item.id}>
              <span className="service-avatar">{(item.name || "?").split(" ").slice(0, 2).map((word) => word[0]).join("")}</span>
              <span><small>{KIND_LABEL[item.kind]}</small><strong>{item.name || "(sin nombre en Core)"}</strong><em>{item.categoria || "Sin categoría"}</em></span>
              <i className={item.status === "active" ? "green" : item.status === "suspended" ? "amber" : "blue"}>{STATUS_LABEL[item.status]}</i>
            </button>
          )) : <p className="service-empty">{serviceProviders.length ? "No hay proveedores que coincidan con estos filtros." : "Todavía no hay proveedores habilitados en esta red."}</p>}
        </div>
      </div>

      {selected ? <article className="service-profile">
        <header>
          <span className="service-profile-avatar">{(selected.name || "?").split(" ").slice(0, 2).map((word) => word[0]).join("")}</span>
          <div><small>{KIND_LABEL[selected.kind]}</small><h2>{selected.name || "(sin nombre en Core)"}</h2><p>{selected.categoria || "Sin categoría"}</p></div>
          <span className={`service-availability ${selected.status === "active" ? "green" : selected.status === "suspended" ? "amber" : "blue"}`}><HiCheckBadge /> {STATUS_LABEL[selected.status]}</span>
        </header>
        <section className="service-profile-facts">
          <div><HiPhone /><span><small>Contacto comercial</small><strong>{selected.phone || "Sin teléfono en Core"}</strong></span></div>
          <div><HiWrenchScrewdriver /><span><small>Disponibilidad declarada</small><strong>{selected.declared_availability || "Sin declarar"}</strong></span></div>
        </section>
        <section className="service-skills"><small>Especialidades</small><div>{(selected.specialty_ids || []).length ? selected.specialty_ids.map((id) => <span key={id}>{serviceSpecialties.find((s) => s.id === id)?.label || id}</span>) : <span>Sin especialidades declaradas</span>}</div></section>

        <section className="service-profile-access">
          <div><HiUserGroup /><span><strong>Contactos operativos</strong><small>Independiente, coordinador o técnicos vinculados a este perfil.</small></span></div>
          {canInvite ? <button type="button" onClick={event => openDialog(event, setShowContact)}>Agregar contacto</button> : null}
        </section>
        {contactsLoading ? <p className="service-empty" role="status">Cargando contactos…</p> : contactsError ? <section className="service-state"><InlineError error={contactsError} /><button type="button" onClick={() => loadContacts(selected.id)}>Reintentar contactos</button></section> : contacts.length ? <ul className="service-contact-list">
          {contacts.map((contact) => <li key={contact.id}>
            <span><strong>{contact.persona_name}</strong><small>{ROLE_LABEL[contact.role]} · {STATUS_LABEL[contact.status] || contact.status}</small></span>
            {canInvite ? <span className="service-contact-actions">
              <button type="button" disabled={busy} onClick={withBusy(async () => { await inviteServiceContact(contact.id); showToast("Invitación enviada", "success"); })}>Invitar</button>
              <button type="button" disabled={busy} onClick={withBusy(async () => { await revokeServiceContactInvite(contact.id); showToast("Invitación revocada", "success"); })}>Revocar invitación</button>
            </span> : null}
          </li>)}
        </ul> : <p className="service-empty">Sin contactos todavía.</p>}

        {canApprove ? <section className="service-profile-actions">
          {selected.status === "active" ? <button type="button" disabled={busy} onClick={() => askReason({ title: `¿Suspender a ${selected.name}?`, subtitle: "El perfil queda suspendido hasta que lo reactives.", confirmLabel: "Suspender", danger: true, done: "Proveedor suspendido", hint: "El motivo queda en la bitácora del proveedor.", action: (reason) => suspendServiceProvider(selected.id, reason) })}>Suspender</button> : null}
          {selected.status === "suspended" ? <button type="button" disabled={busy} onClick={withBusy(async () => { await reactivateServiceProvider(selected.id); showToast("Proveedor reactivado", "success"); })}>Reactivar</button> : null}
          {selected.status !== "archived" ? <button type="button" disabled={busy} onClick={() => askReason({ title: `¿Archivar a ${selected.name}?`, subtitle: "Se archiva el perfil. El historial se conserva.", confirmLabel: "Archivar", danger: true, done: "Proveedor archivado", hint: "El motivo queda en la bitácora del proveedor.", action: (reason) => archiveServiceProvider(selected.id, reason) })}>Archivar</button> : null}
        </section> : null}
      </article> : null}
    </section>

    <Modal open={showEnable} onClose={() => setShowEnable(false)} title="Habilitar proveedor" subtitle="Vincula un proveedor ya registrado en Core" icon={<HiBuildingOffice2 />} footer={<><button type="button" onClick={() => setShowEnable(false)}>Cancelar</button><button type="submit" form="enable-provider-form" disabled={busy}>{busy ? "Habilitando…" : "Habilitar"}</button></>}>
      <WorkflowForm id="enable-provider-form" className="properties-form" onSubmit={submitEnable}>
        <InlineError error={actionError} />
        <section className="properties-form-section"><div className="properties-form-grid">
          <label className="properties-form-wide"><span>Buscar proveedor en Core</span><input value={coreQuery} onChange={(event) => searchCore(event.target.value)} placeholder="Nombre o categoría" aria-invalid={Boolean(fieldErrors.coreProviderId)} /><FieldError msg={fieldErrors.coreProviderId} /></label>
          {coreSearching ? <p className="service-empty" role="status">Buscando…</p> : null}
          <InlineError error={coreError} />
          {coreError ? <button type="button" onClick={() => searchCore(coreQuery)}>Reintentar búsqueda</button> : null}
          {!coreSearching && !coreError && coreQuery.trim() && !enableDraft.coreProviderId && !coreResults.length ? <p className="service-empty">No encontramos ese proveedor. Regístralo primero en el catálogo de Core.</p> : null}
          <a href="/ecosistema/proveedores" target="_blank" rel="noopener noreferrer">Abrir catálogo de proveedores de Core <HiArrowRight /></a>
          {coreResults.length ? <ul className="service-core-results">{coreResults.map((provider) => <li key={provider.id}><button type="button" onClick={() => pickCoreProvider(provider)}>{provider.name} <small>{provider.categoria || ""}</small></button></li>)}</ul> : null}
          {enableDraft.coreProviderId ? <p className="service-core-selected">Seleccionado: <strong>{enableDraft.name}</strong></p> : null}
          <label><span>Tipo</span><select value={enableDraft.kind} onChange={(event) => setEnableDraft({ ...enableDraft, kind: event.target.value })}><option value="independent">Profesional independiente</option><option value="company">Empresa proveedora</option></select></label>
          <label><span>Disponibilidad declarada</span><input value={enableDraft.declaredAvailability} onChange={(event) => setEnableDraft({ ...enableDraft, declaredAvailability: event.target.value })} placeholder="Ej. tiempo completo" /></label>
          <fieldset className="properties-form-wide service-specialty-field"><legend>Especialidades</legend><div className="registration-specialties">{serviceSpecialties.map((specialty) => <label key={specialty.id} className="registration-specialty-chip"><input type="checkbox" checked={enableDraft.specialtyIds.includes(specialty.id)} onChange={() => toggleSpecialty(specialty.id)} /> {specialty.label}</label>)}</div></fieldset>
          <label className="properties-form-wide"><span>Descripción</span><textarea rows="2" value={enableDraft.description} onChange={(event) => setEnableDraft({ ...enableDraft, description: event.target.value })} /></label>
        </div></section>
      </WorkflowForm>
    </Modal>

    <Modal open={showContact} onClose={() => setShowContact(false)} title="Agregar contacto" subtitle={selected?.name} icon={<HiUserGroup />} footer={<><button type="button" onClick={() => setShowContact(false)}>Cancelar</button><button type="submit" form="add-contact-form" disabled={busy}>{busy ? "Guardando…" : "Agregar"}</button></>}>
      <WorkflowForm id="add-contact-form" className="properties-form" noValidate onSubmit={submitContact}>
        <InlineError error={actionError} />
        <section className="properties-form-section"><div className="properties-form-grid">
          <label className="properties-form-wide"><span>Nombre completo</span><input aria-invalid={Boolean(fieldErrors.name)} value={contactDraft.name} onChange={(event) => setContactDraft({ ...contactDraft, name: event.target.value })} /><FieldError msg={fieldErrors.name} /></label>
          <label><span>Correo</span><input type="email" aria-invalid={Boolean(fieldErrors.email)} value={contactDraft.email} onChange={(event) => setContactDraft({ ...contactDraft, email: event.target.value })} /><FieldError msg={fieldErrors.email} /></label>
          <label><span>Teléfono</span><input value={contactDraft.phone} onChange={(event) => setContactDraft({ ...contactDraft, phone: event.target.value })} /></label>
          <label><span>Rol</span><select value={contactDraft.role} onChange={(event) => setContactDraft({ ...contactDraft, role: event.target.value })}><option value="independent">Independiente</option><option value="coordinator">Coordinador</option><option value="technician">Técnico</option></select></label>
          <label><span>Modalidad</span><select value={contactDraft.invitationMode} onChange={(event) => setContactDraft({ ...contactDraft, invitationMode: event.target.value })}><option value="permanent">Permanente</option><option value="single_order">Una sola orden</option></select></label>
        </div></section>
      </WorkflowForm>
    </Modal>

    <Modal open={showApplications} onClose={() => setShowApplications(false)} title="Solicitudes pendientes" subtitle="Revisión administrativa" icon={<HiShieldCheck />} width="max-w-[720px]">
      <InlineError error={actionError} />
      {serviceApplications.length ? <ul className="service-application-list">
        {serviceApplications.map((application) => <li key={application.id}>
          <div><strong>{application.name}</strong><small>{application.folio} · {KIND_LABEL[application.kind]}</small><em>{application.email_normalized}{application.phone ? ` · ${application.phone}` : ""}</em>{application.representative_name ? <p>Representante: {application.representative_name}</p> : null}<p>Especialidades: {(application.specialty_ids || []).map(id => serviceSpecialties.find(specialty => specialty.id === id)?.label || id).join(", ") || "Sin declarar"}</p>{application.coverage ? <p>Cobertura: {application.coverage}</p> : null}{application.experience ? <p>Experiencia: {application.experience}</p> : null}</div>
          <span className="service-application-actions">
            <button type="button" disabled={busy} onClick={() => openApproval(application)}>Aprobar</button>
            <button type="button" disabled={busy} onClick={() => rejectApplication(application)}>Rechazar</button>
          </span>
        </li>)}
      </ul> : <p className="service-empty">No hay solicitudes pendientes.</p>}
    </Modal>

    <Modal
      open={Boolean(reasonAsk)}
      onClose={() => { setReasonAsk(null); setReasonText(""); }}
      title={reasonAsk?.title || ""}
      subtitle={reasonAsk?.subtitle}
      icon={<HiExclamationTriangle />}
      width="max-w-[460px]"
      footer={<>
        <button type="button" onClick={() => { setReasonAsk(null); setReasonText(""); }}>Cancelar</button>
        <button type="submit" form="service-reason-form" disabled={busy || !reasonText.trim()}>{busy ? "Procesando…" : reasonAsk?.confirmLabel || "Aceptar"}</button>
      </>}
    >
      <InlineError error={actionError} />
      <WorkflowForm id="service-reason-form" className="properties-form" onSubmit={(event) => { event.preventDefault(); confirmReason(); }}>
        <section className="properties-form-section"><div className="properties-form-grid">
          <label className="properties-form-wide">
            <span>Motivo</span>
            <textarea rows="3" autoFocus value={reasonText} onChange={(event) => setReasonText(event.target.value)} placeholder="Explica brevemente por qué." />
          </label>
          {reasonAsk?.hint ? <p className="service-reason-hint">{reasonAsk.hint}</p> : null}
        </div></section>
      </WorkflowForm>
    </Modal>

    <Modal
      open={Boolean(approveFor)}
      onClose={() => setApproveFor(null)}
      title="Aprobar solicitud"
      subtitle={approveFor ? `${approveFor.name} · ${approveFor.folio}` : ""}
      icon={<HiShieldCheck />}
      width="max-w-[560px]"
      footer={<>
        <button type="button" onClick={() => setApproveFor(null)}>Cancelar</button>
        <button type="button" className="is-primary" disabled={busy || !approvePick} onClick={confirmApproval}>{busy ? "Aprobando…" : "Aprobar y vincular"}</button>
      </>}
    >
      <InlineError error={actionError} />
      <div className="properties-form"><section className="properties-form-section"><div className="properties-form-grid">
        <p className="service-approve-help">Vincula la solicitud con el proveedor que ya existe en el catálogo de Core. Si todavía no está, regístralo primero en el <a href="/ecosistema/proveedores" target="_blank" rel="noopener noreferrer">catálogo de proveedores de Core</a> y vuelve aquí.</p>
        <label className="properties-form-wide">
          <span>Buscar proveedor en Core</span>
          <input value={approveQuery} onChange={(event) => searchCoreForApproval(event.target.value)} placeholder="Nombre o categoría" />
        </label>
        {approveSearching ? <p className="service-empty" role="status">Buscando…</p> : null}
        <InlineError error={approveError} />
        {approveError ? <button type="button" onClick={() => searchCoreForApproval(approveQuery)}>Reintentar búsqueda</button> : null}
        {!approveSearching && !approveError && approveQuery.trim() && !approveResults.length ? <p className="service-empty">Ningún proveedor de Core coincide con esa búsqueda.</p> : null}
        {approveResults.length ? <ul className="service-core-results">
          {approveResults.map((provider) => <li key={provider.id}>
            <button type="button" className={approvePick?.id === provider.id ? "active" : ""} onClick={() => setApprovePick(provider)}>
              {provider.name} <small>{provider.categoria || ""}</small>
            </button>
          </li>)}
        </ul> : null}
        {approvePick ? <p className="service-core-selected">Se vinculará con: <strong>{approvePick.name}</strong></p> : null}
      </div></section></div>
    </Modal>
  </main></EcoLayout>;
}

export default ServiceNetworkPage;
