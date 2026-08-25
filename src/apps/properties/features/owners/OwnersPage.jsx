import { useMemo, useState } from "react";
import {
  HiArchiveBox,
  HiArrowLeft,
  HiBuildingOffice2,
  HiMagnifyingGlass,
  HiPencilSquare,
  HiPlus,
  HiUserGroup,
} from "react-icons/hi2";
import { useNavigate } from "react-router-dom";
import FieldError from "@/components/shared/FieldError";
import Modal from "@/components/ui/Modal";
import { useAppContext } from "@/context/AppContext";
import EcoLayout from "@/pages/Ecosystem/EcoLayout";
import { EMPTY_OWNER, validateOwner } from "./ownerModel";
import { usePropertiesData } from "../../data/PropertiesDataContext";
import "./owners.css";

const TYPE_LABEL = { individual: "Persona física", company: "Persona moral" };

function OwnersPage() {
  const navigate = useNavigate();
  const { canUseFeature, showToast } = useAppContext();
  const canWrite = canUseFeature("properties.owners.write") || canUseFeature("properties.write");
  const { owners, properties, addOwner, updateOwner, archiveOwner: archiveOwnerRecord } = usePropertiesData();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("active");
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(EMPTY_OWNER);
  const [errors, setErrors] = useState({});
  const modalOpen = editingId !== null;

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return owners.filter((owner) => {
      const matchesStatus = status === "all" || owner.status === status;
      const matchesText = !normalized || [owner.name, owner.email, owner.phone].some((value) => value.toLowerCase().includes(normalized));
      return matchesStatus && matchesText;
    });
  }, [owners, query, status]);

  const openCreate = () => {
    setEditingId("new");
    setDraft(EMPTY_OWNER);
    setErrors({});
  };

  const openEdit = (owner) => {
    setEditingId(owner.id);
    setDraft({ name: owner.name, personType: owner.personType, email: owner.email, phone: owner.phone, notes: owner.notes });
    setErrors({});
  };

  const closeModal = () => {
    setEditingId(null);
    setErrors({});
  };

  const updateDraft = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const saveOwner = (event) => {
    event.preventDefault();
    const nextErrors = validateOwner(draft);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    if (editingId === "new") {
      addOwner(draft);
      showToast("Propietario agregado a esta sesión de frontend", "success");
    } else {
      updateOwner(editingId, draft);
      showToast("Propietario actualizado", "success");
    }
    closeModal();
  };

  const archiveOwner = (owner) => {
    const activeProperties = properties.filter((property) => property.ownerId === owner.id && property.status === "active").length;
    if (activeProperties > 0) {
      showToast(`No puedes archivarlo: tiene ${activeProperties} ${activeProperties === 1 ? "propiedad activa" : "propiedades activas"}`, "warning");
      return;
    }
    archiveOwnerRecord(owner.id);
    showToast("Propietario archivado", "success");
  };

  return (
    <EcoLayout active="properties" title="Propietarios" subtitle="OwnTerra Properties · Directorio operativo">
      <main className="owners-page">
        <button className="owners-back" type="button" onClick={() => navigate("/properties")}><HiArrowLeft /> Volver a Properties</button>

        <header className="owners-header">
          <div>
            <span>Base del portafolio</span>
            <h1>Propietarios</h1>
            <p>Personas y empresas que confían sus inmuebles a la organización.</p>
          </div>
          <button className="owners-primary" type="button" onClick={openCreate} disabled={!canWrite}><HiPlus /> Nuevo propietario</button>
        </header>

        <aside className="owners-prototype-note">
          Esta entrega valida el flujo frontend. Los registros creados viven únicamente durante esta sesión y no se envían al backend todavía.
        </aside>

        <section className="owners-toolbar" aria-label="Filtros de propietarios">
          <label className="owners-search"><HiMagnifyingGlass /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, correo o teléfono" /></label>
          <div className="owners-segments">
            {[['active', 'Activos'], ['archived', 'Archivados'], ['all', 'Todos']].map(([value, label]) => (
              <button type="button" key={value} className={status === value ? "active" : ""} onClick={() => setStatus(value)}>{label}</button>
            ))}
          </div>
        </section>

        {filtered.length ? (
          <section className="owners-list" aria-label="Listado de propietarios">
            {filtered.map((owner) => (
              <article className="owner-row" key={owner.id}>
                <span className="owner-avatar">{owner.name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</span>
                <div className="owner-main"><strong>{owner.name}</strong><span>{TYPE_LABEL[owner.personType]} · {owner.email}</span></div>
                <div className="owner-contact"><span>Teléfono</span><strong>{owner.phone}</strong></div>
                <div className="owner-contact"><span>Propiedades</span><strong>{properties.filter((property) => property.ownerId === owner.id && property.status === "active").length}</strong></div>
                <span className={`owner-status ${owner.status}`}>{owner.status === "active" ? "Activo" : "Archivado"}</span>
                {canWrite && owner.status === "active" ? (
                  <div className="owner-actions">
                    <button type="button" onClick={() => openEdit(owner)} aria-label={`Editar ${owner.name}`}><HiPencilSquare /></button>
                    <button type="button" onClick={() => archiveOwner(owner)} aria-label={`Archivar ${owner.name}`}><HiArchiveBox /></button>
                  </div>
                ) : null}
              </article>
            ))}
          </section>
        ) : (
          <section className="owners-empty">
            <span><HiUserGroup /></span>
            <h2>{owners.length ? "No encontramos propietarios" : "Comienza tu directorio de propietarios"}</h2>
            <p>{owners.length ? "Prueba con otra búsqueda o cambia el estado seleccionado." : "Registra primero a la persona o empresa dueña de los inmuebles que vas a administrar."}</p>
            {!owners.length && canWrite ? <button type="button" onClick={openCreate}><HiPlus /> Crear primer propietario</button> : null}
          </section>
        )}
      </main>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingId === "new" ? "Nuevo propietario" : "Editar propietario"}
        subtitle="Información mínima para iniciar su expediente."
        icon={<HiBuildingOffice2 />}
        width="max-w-[660px]"
        footer={(
          <><button className="owners-secondary" type="button" onClick={closeModal}>Cancelar</button><button className="owners-primary" type="submit" form="owner-form">Guardar propietario</button></>
        )}
      >
        <form id="owner-form" className="properties-form" onSubmit={saveOwner} noValidate>
          <section className="properties-form-section">
            <header><span className="properties-form-step">01</span><div><h3>Identidad del propietario</h3><p>Datos con los que aparecerá en el portafolio.</p></div></header>
            <div className="properties-form-grid">
              <label><span>Tipo de persona</span><select value={draft.personType} onChange={(event) => updateDraft("personType", event.target.value)}><option value="individual">Persona física</option><option value="company">Persona moral</option></select></label>
              <label className="properties-form-wide"><span>Nombre completo o razón social <b>*</b></span><input value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} placeholder="Ej. María López o Inmobiliaria Norte" aria-invalid={Boolean(errors.name)} /><FieldError msg={errors.name} /></label>
            </div>
          </section>
          <section className="properties-form-section">
            <header><span className="properties-form-step">02</span><div><h3>Información de contacto</h3><p>Canales principales para la operación diaria.</p></div></header>
            <div className="properties-form-grid">
              <label><span>Correo electrónico <b>*</b></span><input type="email" value={draft.email} onChange={(event) => updateDraft("email", event.target.value)} placeholder="nombre@empresa.com" aria-invalid={Boolean(errors.email)} /><FieldError msg={errors.email} /></label>
              <label><span>Teléfono <b>*</b></span><input value={draft.phone} onChange={(event) => updateDraft("phone", event.target.value)} placeholder="+52 55 0000 0000" aria-invalid={Boolean(errors.phone)} /><FieldError msg={errors.phone} /></label>
            </div>
          </section>
          <section className="properties-form-section is-compact">
            <div className="properties-form-grid"><label className="properties-form-wide"><span>Notas internas <small>Opcional</small></span><textarea rows="3" value={draft.notes} onChange={(event) => updateDraft("notes", event.target.value)} placeholder="Acuerdos, preferencias o contexto para el equipo…" /></label></div>
          </section>
        </form>
      </Modal>
    </EcoLayout>
  );
}

export default OwnersPage;
