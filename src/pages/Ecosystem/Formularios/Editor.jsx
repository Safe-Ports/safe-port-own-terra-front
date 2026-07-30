import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import EcoLayout from "../EcoLayout";
import { formService } from "@/services/formService";
import { useAppContext } from "@/context/AppContext";
import useEscapeKey from "@/hooks/useEscapeKey";
import { useLocale } from "@/i18n";

let _fieldCounter = 0;
const makeFieldId = () => `f${++_fieldCounter}`;

function FieldModal({ field, onSave, onClose }) {
  const { t } = useLocale();
  useEscapeKey(onClose);
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
            <div className="usr-modal-title">{field?.id ? t("forms.editor.editField") : t("forms.editor.newField")}</div>
            <div className="usr-modal-sub">{t("forms.editor.freeText")}</div>
          </div>
          <button className="usr-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="usr-modal-body">
          <div className="usr-field">
            <label className="usr-field-lbl">{t("forms.editor.fieldName")}</label>
            <input
              className="usr-input"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={handleKey}
              placeholder={t("forms.editor.fieldExample")}
              autoFocus
            />
          </div>
          <div className="usr-field">
            <label className="usr-field-lbl">{t("forms.editor.help")}</label>
            <input
              className="usr-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={handleKey}
              placeholder={t("forms.editor.helpExample")}
            />
          </div>
          <label className="usr-check">
            <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} />
            {t("forms.editor.requiredField")}
          </label>
        </div>
        <div className="usr-modal-foot">
          <button className="usr-btn-ghost" onClick={onClose}>{t("forms.editor.cancel")}</button>
          <button className="usr-btn-primary" onClick={save} disabled={!label.trim()}>
            ✓ {field?.id ? t("forms.editor.saveChanges") : t("forms.editor.addField")}
          </button>
        </div>
      </div>
    </div>
  );
}

function Preview({ name, description, fields, logoUrl }) {
  const { t } = useLocale();
  return (
    <div>
      {logoUrl ? (
        <img src={logoUrl} alt="Logo" style={{ height: 44, maxWidth: 160, objectFit: "contain", marginBottom: 16, borderRadius: 8 }} />
      ) : (
        <img src="/ownterra ecosistem.png" alt="OwnTerra" style={{ height: 36, maxWidth: 140, objectFit: "contain", marginBottom: 16, opacity: .55 }} onError={(e) => { e.currentTarget.style.display = "none"; }} />
      )}
      <div className="fom-prev-name">
        {name || <span style={{ color: "var(--text3)", fontStyle: "italic" }}>{t("forms.editor.unnamed")}</span>}
      </div>
      {description && <div className="fom-prev-desc">{description}</div>}
      <div style={{ height: 1, background: "var(--border)", margin: "14px 0 18px" }} />
      {fields.length === 0 ? (
        <div className="fom-prev-empty">{t("forms.editor.emptyPreview")}</div>
      ) : (
        <div className="fom-prev-fields">
          {fields.map((f) => (
            <div key={f.id} className="fom-prev-field">
              <div className="fom-prev-lbl">
                {f.label || t("forms.editor.field")}
                {f.required && <span style={{ color: "#C0392B", marginLeft: 2 }}>*</span>}
              </div>
              {f.description && <div className="fom-prev-hint">{f.description}</div>}
              <input className="fom-prev-input" placeholder={t("forms.editor.typeHere")} readOnly tabIndex={-1} />
            </div>
          ))}
          <button className="fom-prev-btn">{t("forms.editor.submitInfo")}</button>
        </div>
      )}
    </div>
  );
}

function EcosystemFormEditor() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { id } = useParams();
  const isEdit = !!id;
  const { showToast, showError } = useAppContext();

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
    if (file.size > 2 * 1024 * 1024) { showToast(t("forms.editor.imageMax"), "warning"); return; }
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
      showToast(isEdit ? t("forms.editor.updated") : t("forms.editor.savedDraft"));
      goBack();
    },
    onError: (err) => showError(err, t("forms.editor.saveError")),
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
      showToast(t("forms.editor.publishedLink"));
      goBack();
    },
    onError: (err) => showError(err, t("forms.editor.publishError")),
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
    if (!name.trim()) { showToast(t("forms.editor.nameRequired"), "warning"); return false; }
    return true;
  };

  const handleDraft = () => { if (validate()) saveMutation.mutate(getPayload()); };
  const handlePublish = () => {
    if (!validate()) return;
    if (isEdit && existing?.is_published) { saveMutation.mutate(getPayload()); return; }
    publishMutation.mutate(getPayload());
  };

  const isBusy = saveMutation.isPending || publishMutation.isPending;
  const publishLabel = isEdit && existing?.is_published ? t("forms.editor.saveChanges") : t("forms.editor.savePublish");

  return (
    <EcoLayout
      active="formularios"
      title={isEdit ? t("forms.editor.editForm") : t("forms.editor.newForm")}
      subtitle={isEdit ? t("forms.editor.editing").replace("{name}", name || "…") : t("forms.editor.designFields")}
    >
      <div className="section-head">
        <h3>{isEdit ? t("forms.editor.editForm") : t("forms.editor.createForm")}</h3>
        <button className="usr-btn-ghost" onClick={goBack} style={{ fontSize: 12 }}>{t("forms.editor.back")}</button>
      </div>

      <div className="fom-editor">

        {/* CONSTRUCTOR */}
        <div className="fom-builder">
          <div className="usr-field">
            <label className="usr-field-lbl">{t("forms.editor.formName")}</label>
            <input
              className="usr-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("forms.editor.formExample")}
            />
          </div>
          <div className="usr-field" style={{ marginBottom: 22 }}>
            <label className="usr-field-lbl">{t("forms.editor.description")}</label>
            <textarea
              className="usr-input"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("forms.editor.descriptionHelp")}
              style={{ resize: "vertical" }}
            />
          </div>

          <div className="fom-section-label">{t("forms.editor.formLogo")}</div>
          <div className="fom-logo-zone">
            {logoUrl ? (
              <div className="fom-logo-preview">
                <img src={logoUrl} alt="Logo" className="fom-logo-img" />
                <button className="fom-logo-remove" onClick={() => setLogoUrl("")} title={t("forms.editor.removeLogo")}>×</button>
              </div>
            ) : (
              <label className="fom-logo-upload">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
                <span>{t("forms.editor.selectImage")}</span>
                <small>{t("forms.editor.imageTypes")}</small>
                <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden onChange={handleLogoFile} />
              </label>
            )}
            <div className="fom-logo-note">
              {t("forms.editor.logoNote")}
            </div>
          </div>

          <div className="fom-section-label" style={{ marginTop: 22 }}>{t("forms.editor.formFields")}</div>

          {fields.length > 0 && (
            <div className="fom-field-list">
              {fields.map((f, i) => (
                <div key={f.id} className="fom-field-item">
                  <div className="fom-field-info">
                    <div className="fom-field-label">
                      {f.label}
                      {f.required && <span className="fom-field-req">{t("forms.editor.required")}</span>}
                    </div>
                    {f.description && <div className="fom-field-hint">{f.description}</div>}
                  </div>
                  <div className="fom-field-btns">
                    <button className="fom-icon-btn" onClick={() => moveField(i, -1)} disabled={i === 0} title={t("forms.editor.moveUp")}>↑</button>
                    <button className="fom-icon-btn" onClick={() => moveField(i, 1)} disabled={i === fields.length - 1} title={t("forms.editor.moveDown")}>↓</button>
                    <button className="fom-icon-btn" onClick={() => setFieldModal({ field: f })} title={t("forms.edit")}>✏️</button>
                    <button className="fom-icon-btn danger" onClick={() => removeField(f.id)} title={t("forms.editor.delete")}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button className="fom-add-field" onClick={() => setFieldModal({})}>
            {t("forms.editor.addFieldButton")}
          </button>

          <div className="fom-editor-foot">
            <button className="usr-btn-ghost" onClick={goBack}>{t("forms.editor.cancel")}</button>
            <button className="usr-btn-ghost" onClick={handleDraft} disabled={isBusy}>
              {saveMutation.isPending ? t("forms.editor.saving") : t("forms.editor.saveDraft")}
            </button>
            <button className="usr-btn-primary" onClick={handlePublish} disabled={isBusy}>
              {publishMutation.isPending ? t("forms.editor.publishing") : publishLabel}
            </button>
          </div>
        </div>

        {/* PREVIEW */}
        <div className="fom-preview-col">
          <div className="fom-section-label">{t("forms.editor.livePreview")}</div>
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
