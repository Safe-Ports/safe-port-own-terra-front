import { useMemo, useState } from "react";
import { HiExclamationTriangle, HiArrowLeft, HiArrowRight, HiBuildingOffice2, HiCheckBadge, HiLink, HiPhone, HiPlus, HiShieldCheck, HiUserGroup, HiWrenchScrewdriver } from "react-icons/hi2";
import { useNavigate } from "react-router-dom";
import EcoLayout from "@/pages/Ecosystem/EcoLayout";
import Modal from "@/components/ui/Modal";
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
    serviceNetworkLoading, serviceNetworkError,
    enableServiceProvider, suspendServiceProvider, reactivateServiceProvider, archiveServiceProvider,
    getServiceProviderContacts, addServiceProviderContact, inviteServiceContact, revokeServiceContactInvite,
    createServiceEnrollmentLink, approveServiceApplication, rejectServiceApplication,
  } = usePropertiesData();

  const [filter, setFilter] = useState("all");
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

  const visible = useMemo(() => (filter === "all" ? serviceProviders : serviceProviders.filter((item) => item.kind === filter)), [filter, serviceProviders]);
  const selected = serviceProviders.find((item) => item.id === selectedId) || visible[0] || null;

  const loadContacts = async (profileId) => {
    setContactsLoading(true);
    try { setContacts(await getServiceProviderContacts(profileId)); }
    catch { setContacts([]); }
    finally { setContactsLoading(false); }
  };

  const selectProvider = (item) => { setSelectedId(item.id); loadContacts(item.id); };

  const searchCore = async (query) => {
    setCoreQuery(query);
    if (!query.trim()) { setCoreResults([]); return; }
    setCoreSearching(true);
    try { setCoreResults((await providerService.list({ search: query, limit: 10 })).items || []); }
    catch { setCoreResults([]); }
    finally { setCoreSearching(false); }
  };

  const pickCoreProvider = (provider) => {
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
    if (!enableDraft.coreProviderId) return showToast("Busca y selecciona el proveedor en el catálogo de Core", "warning");
    setBusy(true);
    try {
      await enableServiceProvider(enableDraft);
      showToast("Proveedor habilitado en la red de servicio", "success");
      setShowEnable(false);
      setEnableDraft(emptyEnable);
      setCoreQuery("");
    } catch (error) {
      showToast(error.response?.data?.error?.message || error.message, "warning");
    } finally {
      setBusy(false);
    }
  };

  const submitContact = async (event) => {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    try {
      await addServiceProviderContact(selected.id, { mode: "new", ...contactDraft });
      showToast("Contacto agregado", "success");
      setShowContact(false);
      setContactDraft(emptyContact);
      loadContacts(selected.id);
    } catch (error) {
      showToast(error.response?.data?.error?.message || error.message, "warning");
    } finally {
      setBusy(false);
    }
  };

  const withBusy = (action) => async (...args) => {
    setBusy(true);
    try { await action(...args); }
    catch (error) { showToast(error.response?.data?.error?.message || error.message, "warning"); }
    finally { setBusy(false); }
  };

  const askReason = (config) => { setReasonText(""); setReasonAsk(config); };

  const confirmReason = withBusy(async () => {
    const reason = reasonText.trim();
    if (!reason || !reasonAsk) return;
    await reasonAsk.action(reason);
    showToast(reasonAsk.done, "success");
    setReasonAsk(null);
    setReasonText("");
  });

  const searchCoreForApproval = async (query) => {
    setApproveQuery(query);
    setApprovePick(null);
    if (!query.trim()) { setApproveResults([]); return; }
    setApproveSearching(true);
    try { setApproveResults((await providerService.list({ search: query, limit: 10 })).items || []); }
    catch { setApproveResults([]); }
    finally { setApproveSearching(false); }
  };

  const openApproval = (application) => {
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

  const createLink = withBusy(async () => {
    const row = await createServiceEnrollmentLink({});
    const url = `${window.location.origin}/servicio/registro?token=${row.token}`;
    try { await navigator.clipboard.writeText(url); showToast("Enlace copiado al portapapeles", "success"); }
    catch { showToast(url, "success"); }
  });

  // Esta fase solo aprueba vinculando un Provider que YA existe en Core
  // (créalo primero desde "Habilitar proveedor" si todavía no está en el
  // catálogo) — la creación delegada queda para la fase de tickets/seguridad.
  const rejectApplication = (application) => askReason({
    title: `¿Rechazar la solicitud de ${application.name}?`,
    subtitle: application.folio,
    confirmLabel: "Rechazar solicitud",
    danger: true,
    done: "Solicitud rechazada",
    hint: "El motivo queda registrado y se le comparte al solicitante.",
    action: (reason) => rejectServiceApplication(application.id, reason),
  });

  if (serviceNetworkLoading) return <EcoLayout active="properties" title="OwnTerra Properties" subtitle="Operación · Red de servicio"><main className="service-page"><p className="service-loading">Cargando red de servicio…</p></main></EcoLayout>;
  if (serviceNetworkError) return <EcoLayout active="properties" title="OwnTerra Properties" subtitle="Operación · Red de servicio"><main className="service-page"><p className="service-loading">No pudimos cargar la red de servicio. Intenta recargar la página.</p></main></EcoLayout>;

  return <EcoLayout active="properties" title="OwnTerra Properties" subtitle="Operación · Red de servicio"><main className="service-page">
    <header className="service-heading">
      <button type="button" onClick={() => navigate("/properties")}><HiArrowLeft /> Properties</button>
      <div><span>Quién resuelve</span><h1>Red de servicio.</h1><p>Proveedores habilitados de Core, sus especialidades y sus contactos operativos.</p></div>
      {canManage ? <button type="button" onClick={() => setShowEnable(true)}><HiPlus /> Habilitar proveedor</button> : null}
    </header>

    <section className="service-access-model">
      <div><HiUserGroup /><span><strong>Equipo interno</strong><small>Reutiliza usuarios y roles del ecosistema.</small></span></div>
      <i />
      <div><HiLink /><span><strong>Proveedor externo</strong><small>Usa su Portal de servicio con acceso limitado por asignación.</small></span></div>
      <button type="button" onClick={() => navigate("/portal-servicio")}>Ver experiencia del técnico <HiArrowRight /></button>
    </section>

    <section className="service-enrollment">
      <div><HiLink /><span><small>Registro autónomo</small><strong>Comparte tu enlace para que los proveedores soliciten acceso.</strong>{serviceEnrollmentLinks[0] ? <em>Vence: {serviceEnrollmentLinks[0].expires_at ? new Date(serviceEnrollmentLinks[0].expires_at).toLocaleDateString("es-MX") : "sin vencimiento"}</em> : <em>Sin enlaces creados todavía.</em>}</span></div>
      {canInvite ? <button type="button" disabled={busy} onClick={createLink}>Generar y copiar enlace</button> : null}
      <i />
      <div><span className="service-request-count">{serviceApplications.length}</span><span><small>Solicitudes pendientes</small><strong>Revisa identidad, especialidad y cobertura antes de aprobar.</strong></span></div>
      {canApprove ? <button type="button" onClick={() => setShowApplications(true)}>Revisar solicitudes</button> : null}
    </section>

    <section className="service-stats">
      <article><small>Red habilitada</small><strong>{serviceProviders.length}</strong><span>{serviceProviders.filter((item) => item.status === "active").length} activos</span></article>
      <article><small>Solicitudes nuevas</small><strong>{serviceApplications.length}</strong><span>Pendientes de revisión</span></article>
      <article><small>Independientes</small><strong>{serviceProviders.filter((item) => item.kind === "independent").length}</strong><span>En la red</span></article>
      <article><small>Empresas</small><strong>{serviceProviders.filter((item) => item.kind === "company").length}</strong><span>En la red</span></article>
    </section>

    <section className="service-layout">
      <div className="service-directory">
        <header><div><span>Directorio operativo</span><h2>Proveedores</h2></div>
          <nav>
            <button type="button" className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>Todos</button>
            <button type="button" className={filter === "independent" ? "active" : ""} onClick={() => setFilter("independent")}>Independientes</button>
            <button type="button" className={filter === "company" ? "active" : ""} onClick={() => setFilter("company")}>Empresas</button>
          </nav>
        </header>
        <div>
          {visible.length ? visible.map((item) => (
            <button type="button" className={selected?.id === item.id ? "active" : ""} onClick={() => selectProvider(item)} key={item.id}>
              <span className="service-avatar">{(item.name || "?").split(" ").slice(0, 2).map((word) => word[0]).join("")}</span>
              <span><small>{KIND_LABEL[item.kind]}</small><strong>{item.name || "(sin nombre en Core)"}</strong><em>{item.categoria || "Sin categoría"}</em></span>
              <i className={item.status === "active" ? "green" : item.status === "suspended" ? "amber" : "blue"}>{STATUS_LABEL[item.status]}</i>
            </button>
          )) : <p className="service-empty">Todavía no hay proveedores habilitados en esta red.</p>}
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
        <section className="service-skills"><small>Especialidades</small><div>{selected.specialty_ids.length ? selected.specialty_ids.map((id) => <span key={id}>{serviceSpecialties.find((s) => s.id === id)?.label || id}</span>) : <span>Sin especialidades declaradas</span>}</div></section>

        <section className="service-profile-access">
          <div><HiUserGroup /><span><strong>Contactos operativos</strong><small>Independiente, coordinador o técnicos vinculados a este perfil.</small></span></div>
          {canInvite ? <button type="button" onClick={() => setShowContact(true)}>Agregar contacto</button> : null}
        </section>
        {contactsLoading ? <p className="service-empty">Cargando contactos…</p> : contacts.length ? <ul className="service-contact-list">
          {contacts.map((contact) => <li key={contact.id}>
            <span><strong>{contact.persona_name}</strong><small>{ROLE_LABEL[contact.role]} · {STATUS_LABEL[contact.status]}</small></span>
            {canInvite ? <span className="service-contact-actions">
              <button type="button" disabled={busy} onClick={withBusy(async () => { await inviteServiceContact(contact.id); showToast("Invitación enviada", "success"); })}>Invitar</button>
              <button type="button" disabled={busy} onClick={withBusy(async () => { await revokeServiceContactInvite(contact.id); showToast("Invitación revocada", "success"); })}>Revocar invitación</button>
            </span> : null}
          </li>)}
        </ul> : <p className="service-empty">Sin contactos todavía.</p>}

        {canApprove ? <section className="service-profile-actions">
          {selected.status === "active" ? <button type="button" disabled={busy} onClick={() => askReason({ title: `¿Suspender a ${selected.name}?`, subtitle: "Deja de recibir asignaciones hasta que lo reactives.", confirmLabel: "Suspender", danger: true, done: "Proveedor suspendido", hint: "El motivo queda en la bitácora del proveedor.", action: (reason) => suspendServiceProvider(selected.id, reason) })}>Suspender</button> : null}
          {selected.status === "suspended" ? <button type="button" disabled={busy} onClick={withBusy(async () => { await reactivateServiceProvider(selected.id); showToast("Proveedor reactivado", "success"); })}>Reactivar</button> : null}
          {selected.status !== "archived" ? <button type="button" disabled={busy} onClick={() => askReason({ title: `¿Archivar a ${selected.name}?`, subtitle: "Sale del directorio operativo. El historial se conserva.", confirmLabel: "Archivar", danger: true, done: "Proveedor archivado", hint: "El motivo queda en la bitácora del proveedor.", action: (reason) => archiveServiceProvider(selected.id, reason) })}>Archivar</button> : null}
        </section> : null}
      </article> : null}
    </section>

    <Modal open={showEnable} onClose={() => setShowEnable(false)} title="Habilitar proveedor" subtitle="Vincula un proveedor ya registrado en Core" icon={<HiBuildingOffice2 />} footer={<><button type="button" onClick={() => setShowEnable(false)}>Cancelar</button><button type="submit" form="enable-provider-form" disabled={busy}>{busy ? "Habilitando…" : "Habilitar"}</button></>}>
      <form id="enable-provider-form" className="properties-form" onSubmit={submitEnable}>
        <section className="properties-form-section"><div className="properties-form-grid">
          <label className="properties-form-wide"><span>Buscar proveedor en Core</span><input value={coreQuery} onChange={(event) => searchCore(event.target.value)} placeholder="Nombre o categoría" /></label>
          {coreSearching ? <p className="service-empty">Buscando…</p> : null}
          {coreResults.length ? <ul className="service-core-results">{coreResults.map((provider) => <li key={provider.id}><button type="button" onClick={() => pickCoreProvider(provider)}>{provider.name} <small>{provider.categoria || ""}</small></button></li>)}</ul> : null}
          {enableDraft.coreProviderId ? <p className="service-core-selected">Seleccionado: <strong>{enableDraft.name}</strong></p> : null}
          <label><span>Tipo</span><select value={enableDraft.kind} onChange={(event) => setEnableDraft({ ...enableDraft, kind: event.target.value })}><option value="independent">Profesional independiente</option><option value="company">Empresa proveedora</option></select></label>
          <label><span>Disponibilidad declarada</span><input value={enableDraft.declaredAvailability} onChange={(event) => setEnableDraft({ ...enableDraft, declaredAvailability: event.target.value })} placeholder="Ej. tiempo completo" /></label>
          <label className="properties-form-wide"><span>Especialidades</span><div className="registration-specialties">{serviceSpecialties.map((specialty) => <label key={specialty.id} className="registration-specialty-chip"><input type="checkbox" checked={enableDraft.specialtyIds.includes(specialty.id)} onChange={() => toggleSpecialty(specialty.id)} /> {specialty.label}</label>)}</div></label>
          <label className="properties-form-wide"><span>Descripción</span><textarea rows="2" value={enableDraft.description} onChange={(event) => setEnableDraft({ ...enableDraft, description: event.target.value })} /></label>
        </div></section>
      </form>
    </Modal>

    <Modal open={showContact} onClose={() => setShowContact(false)} title="Agregar contacto" subtitle={selected?.name} icon={<HiUserGroup />} footer={<><button type="button" onClick={() => setShowContact(false)}>Cancelar</button><button type="submit" form="add-contact-form" disabled={busy}>{busy ? "Guardando…" : "Agregar"}</button></>}>
      <form id="add-contact-form" className="properties-form" onSubmit={submitContact}>
        <section className="properties-form-section"><div className="properties-form-grid">
          <label className="properties-form-wide"><span>Nombre completo</span><input required value={contactDraft.name} onChange={(event) => setContactDraft({ ...contactDraft, name: event.target.value })} /></label>
          <label><span>Correo</span><input type="email" value={contactDraft.email} onChange={(event) => setContactDraft({ ...contactDraft, email: event.target.value })} /></label>
          <label><span>Teléfono</span><input value={contactDraft.phone} onChange={(event) => setContactDraft({ ...contactDraft, phone: event.target.value })} /></label>
          <label><span>Rol</span><select value={contactDraft.role} onChange={(event) => setContactDraft({ ...contactDraft, role: event.target.value })}><option value="independent">Independiente</option><option value="coordinator">Coordinador</option><option value="technician">Técnico</option></select></label>
          <label><span>Modalidad</span><select value={contactDraft.invitationMode} onChange={(event) => setContactDraft({ ...contactDraft, invitationMode: event.target.value })}><option value="permanent">Permanente</option><option value="single_order">Una sola orden</option></select></label>
        </div></section>
      </form>
    </Modal>

    <Modal open={showApplications} onClose={() => setShowApplications(false)} title="Solicitudes pendientes" subtitle="Revisión administrativa" icon={<HiShieldCheck />} width="max-w-[720px]">
      {serviceApplications.length ? <ul className="service-application-list">
        {serviceApplications.map((application) => <li key={application.id}>
          <div><strong>{application.name}</strong><small>{application.folio} · {KIND_LABEL[application.kind]}</small><em>{application.email_normalized}{application.phone ? ` · ${application.phone}` : ""}</em>{application.coverage ? <p>{application.coverage}</p> : null}</div>
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
      <form id="service-reason-form" className="properties-form" onSubmit={(event) => { event.preventDefault(); confirmReason(); }}>
        <section className="properties-form-section"><div className="properties-form-grid">
          <label className="properties-form-wide">
            <span>Motivo</span>
            <textarea rows="3" autoFocus value={reasonText} onChange={(event) => setReasonText(event.target.value)} placeholder="Explica brevemente por qué." />
          </label>
          {reasonAsk?.hint ? <p className="service-reason-hint">{reasonAsk.hint}</p> : null}
        </div></section>
      </form>
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
      <div className="properties-form"><section className="properties-form-section">
        <p className="service-approve-help">Vincula la solicitud con el proveedor que ya existe en el catálogo de Core. Si todavía no está, créalo con <strong>Habilitar proveedor</strong> y vuelve aquí.</p>
        <label className="properties-form-wide">
          <span>Buscar proveedor en Core</span>
          <input value={approveQuery} onChange={(event) => searchCoreForApproval(event.target.value)} placeholder="Nombre o categoría" />
        </label>
        {approveSearching ? <p className="service-empty">Buscando…</p> : null}
        {!approveSearching && approveQuery.trim() && !approveResults.length ? <p className="service-empty">Ningún proveedor de Core coincide con esa búsqueda.</p> : null}
        {approveResults.length ? <ul className="service-core-results">
          {approveResults.map((provider) => <li key={provider.id}>
            <button type="button" className={approvePick?.id === provider.id ? "active" : ""} onClick={() => setApprovePick(provider)}>
              {provider.name} <small>{provider.categoria || ""}</small>
            </button>
          </li>)}
        </ul> : null}
        {approvePick ? <p className="service-core-selected">Se vinculará con: <strong>{approvePick.name}</strong></p> : null}
      </section></div>
    </Modal>
  </main></EcoLayout>;
}

export default ServiceNetworkPage;
