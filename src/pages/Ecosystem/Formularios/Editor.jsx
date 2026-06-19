import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import EcoLayout from "../EcoLayout";
import { formService } from "@/services/formService";
import { useAppContext } from "@/context/AppContext";
import { getUserErrorMessage } from "@/services/errors";

let _fieldCounter = 0;
const makeFieldId = () => `f${++_fieldCounter}`;

function FieldModal({ field, onSave, onClose }) {
  const [label, setLabel] = useState(field?.label ?? "");
  const [description, setDescription] = useState(field?.description ?? "");
  const [required, setRequired] = useState(field?.required ?? false);

  const save = () => {
    if (!label.trim()) return;
    onSave({ id: field?.id ?? makeFieldId(), label: label.trim(), description: description.trim(), required });
  };

  const handleKey = (e) => { if (e.key === "Enter" && label.trim()) save(); };

  return (
    <div className="usr-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="usr-modal" style={{ maxWidth: 460 }}>
        <div className="usr-modal-head">
          <div>
            <div className="usr-modal-title">{field?.id ? "Editar campo" : "Nuevo campo"}</div>
            <div className="usr-modal-sub">Todos los campos capturan texto libre</div>
          </div>
          <button className="usr-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="usr-modal-body">
          <div className="usr-field">
            <label className="usr-field-lbl">Nombre del campo *</label>
            <input
              className="usr-input"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ej. Nombre completo"
              autoFocus
            />
          </div>
          <div className="usr-field">
            <label className="usr-field-lbl">Descripción / ayuda (opcional)</label>
            <input
              className="usr-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ej. Tal como aparece en su identificación oficial"
            />
          </div>
          <label className="usr-check">
            <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} />
            Campo obligatorio
          </label>
        </div>
        <div className="usr-modal-foot">
          <button className="usr-btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="usr-btn-primary" onClick={save} disabled={!label.trim()}>
            ✓ {field?.id ? "Guardar cambios" : "Agregar campo"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Preview({ name, description, fields, logoUrl }) {
  return (
    <div>
      {logoUrl ? (
        <img src={logoUrl} alt="Logo" style={{ height: 44, maxWidth: 160, objectFit: "contain", marginBottom: 16, borderRadius: 8 }} />
      ) : (
        <img src="/ownterra ecosistem.png" alt="OwnTerra" style={{ height: 36, maxWidth: 140, objectFit: "contain", marginBottom: 16, opacity: .55 }} onError={(e) => { e.currentTarget.style.display = "none"; }} />
      )}
      <div className="fom-prev-name">
        {name || <span style={{ color: "var(--text3)", fontStyle: "italic" }}>Nombre del formulario</span>}
      </div>
      {description && <div className="fom-prev-desc">{description}</div>}
      <div style={{ height: 1, background: "var(--border)", margin: "14px 0 18px" }} />
      {fields.length === 0 ? (
        <div className="fom-prev-empty">Los campos que agregues aparecerán aquí</div>
      ) : (
        <div className="fom-prev-fields">
          {fields.map((f) => (
            <div key={f.id} className="fom-prev-field">
              <div className="fom-prev-lbl">
                {f.label || "Campo"}
                {f.required && <span style={{ color: "#C0392B", marginLeft: 2 }}>*</span>}
              </div>
              {f.description && <div className="fom-prev-hint">{f.description}</div>}
              <input className="fom-prev-input" placeholder="Escribe aquí…" readOnly tabIndex={-1} />
            </div>
          ))}
          <button className="fom-prev-btn">Enviar información</button>
        </div>
      )}
    </div>
  );
}

function EcosystemFormEditor() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { id } = useParams();
  const isEdit = !!id;
  const { showToast } = useAppContext();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState([]);
  const [logoUrl, setLogoUrl] = useState("");
  const [fieldModal, setFieldModal] = useState(null);

  const { data: existing } = useQuery({
    queryKey: ["form-template", id],
    queryFn: () => formService.get(id),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      setName(existing.name ?? "");
      setDescription(existing.description ?? "");
      setFields(existing.fields ?? []);
      setLogoUrl(existing.logo_url ?? "");
    }
  }, [existing]);

  const handleLogoFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast("La imagen no debe superar 2 MB"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setLogoUrl(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const goBack = () => navigate("/ecosistema/formularios");

  const saveMutation = useMutation({
    mutationFn: (payload) => isEdit ? formService.update(id, payload) : formService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["form-templates"] });
      if (isEdit) qc.invalidateQueries({ queryKey: ["form-template", id] });
      showToast(isEdit ? "Formulario actualizado" : "Formulario guardado como borrador");
      goBack();
    },
    onError: (err) => showToast(getUserErrorMessage(err, "Error al guardar")),
  });

  const publishMutation = useMutation({
    mutationFn: async (payload) => {
      let result;
      if (isEdit) {
        result = await formService.update(id, payload);
        if (!existing?.is_published) await formService.togglePublish(result.id);
      } else {
        result = await formService.create(payload);
        await formService.togglePublish(result.id);
      }
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["form-templates"] });
      showToast("Formulario publicado · link activo");
      goBack();
    },
    onError: (err) => showToast(getUserErrorMessage(err, "Error al publicar")),
  });

  const moveField = (index, dir) => {
    const swap = index + dir;
    if (swap < 0 || swap >= fields.length) return;
    const next = [...fields];
    [next[index], next[swap]] = [next[swap], next[index]];
    setFields(next);
  };

  const saveField = (fieldData) => {
    setFields((prev) => {
      const idx = prev.findIndex((f) => f.id === fieldData.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = fieldData; return next; }
      return [...prev, fieldData];
    });
    setFieldModal(null);
  };

  const removeField = (fieldId) => setFields((prev) => prev.filter((f) => f.id !== fieldId));

  const getPayload = () => ({ name: name.trim(), description: description.trim(), fields, logo_url: logoUrl });

  const validate = () => {
    if (!name.trim()) { showToast("El nombre del formulario es obligatorio"); return false; }
    return true;
  };

  const handleDraft = () => { if (validate()) saveMutation.mutate(getPayload()); };
  const handlePublish = () => {
    if (!validate()) return;
    if (isEdit && existing?.is_published) { saveMutation.mutate(getPayload()); return; }
    publishMutation.mutate(getPayload());
  };

  const isBusy = saveMutation.isPending || publishMutation.isPending;
  const publishLabel = isEdit && existing?.is_published ? "Guardar cambios" : "Guardar y publicar";

  return (
    <EcoLayout
      active="formularios"
      title={isEdit ? "Editar formulario" : "Nuevo formulario"}
      subtitle={isEdit ? `Editando: ${name || "…"}` : "Diseña los campos de captura"}
    >
      <div className="section-head">
        <h3>{isEdit ? "Editar formulario" : "Crear formulario"}</h3>
        <button className="usr-btn-ghost" onClick={goBack} style={{ fontSize: 12 }}>← Volver a formularios</button>
      </div>

      <div className="fom-editor">

        {/* CONSTRUCTOR */}
        <div className="fom-builder">
          <div className="usr-field">
            <label className="usr-field-lbl">Nombre del formulario *</label>
            <input
              className="usr-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Ficha de registro — Preventas Sector B"
            />
          </div>
          <div className="usr-field" style={{ marginBottom: 22 }}>
            <label className="usr-field-lbl">Descripción (opcional)</label>
            <textarea
              className="usr-input"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve instrucción para quien llene el formulario"
              style={{ resize: "vertical" }}
            />
          </div>

          <div className="fom-section-label">Logo del formulario</div>
          <div className="fom-logo-zone">
            {logoUrl ? (
              <div className="fom-logo-preview">
                <img src={logoUrl} alt="Logo" className="fom-logo-img" />
                <button className="fom-logo-remove" onClick={() => setLogoUrl("")} title="Quitar logo">×</button>
              </div>
            ) : (
              <label className="fom-logo-upload">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
                <span>Seleccionar imagen</span>
                <small>PNG, JPG · máx. 2 MB</small>
                <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden onChange={handleLogoFile} />
              </label>
            )}
            <div className="fom-logo-note">
              Si no se sube imagen, el formulario público mostrará el logo de OwnTerra.
            </div>
          </div>

          <div className="fom-section-label" style={{ marginTop: 22 }}>Campos del formulario</div>

          {fields.length > 0 && (
            <div className="fom-field-list">
              {fields.map((f, i) => (
                <div key={f.id} className="fom-field-item">
                  <div className="fom-field-info">
                    <div className="fom-field-label">
                      {f.label}
                      {f.required && <span className="fom-field-req">Obligatorio</span>}
                    </div>
                    {f.description && <div className="fom-field-hint">{f.description}</div>}
                  </div>
                  <div className="fom-field-btns">
                    <button className="fom-icon-btn" onClick={() => moveField(i, -1)} disabled={i === 0} title="Subir">↑</button>
                    <button className="fom-icon-btn" onClick={() => moveField(i, 1)} disabled={i === fields.length - 1} title="Bajar">↓</button>
                    <button className="fom-icon-btn" onClick={() => setFieldModal({ field: f })} title="Editar">✏️</button>
                    <button className="fom-icon-btn danger" onClick={() => removeField(f.id)} title="Eliminar">🗑</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button className="fom-add-field" onClick={() => setFieldModal({})}>
            + Agregar campo
          </button>

          <div className="fom-editor-foot">
            <button className="usr-btn-ghost" onClick={goBack}>Cancelar</button>
            <button className="usr-btn-ghost" onClick={handleDraft} disabled={isBusy}>
              {saveMutation.isPending ? "Guardando…" : "Guardar borrador"}
            </button>
            <button className="usr-btn-primary" onClick={handlePublish} disabled={isBusy}>
              {publishMutation.isPending ? "Publicando…" : publishLabel}
            </button>
          </div>
        </div>

        {/* PREVIEW */}
        <div className="fom-preview-col">
          <div className="fom-section-label">Vista previa en vivo</div>
          <Preview name={name} description={description} fields={fields} logoUrl={logoUrl} />
        </div>
      </div>

      {fieldModal !== null && (
        <FieldModal
          field={fieldModal.field}
          onSave={saveField}
          onClose={() => setFieldModal(null)}
        />
      )}
    </EcoLayout>
  );
}

export default EcosystemFormEditor;
