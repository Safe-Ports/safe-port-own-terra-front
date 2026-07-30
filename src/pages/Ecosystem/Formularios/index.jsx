import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import GuideModal from "@/components/shared/GuideModal";
import EcoLayout from "../EcoLayout";
import { formService } from "@/services/formService";
import { useAppContext } from "@/context/AppContext";
import { useLocale } from "@/i18n";

const FormIco = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="3" width="14" height="18" rx="2" />
    <path d="M9 3v2h6V3" />
    <line x1="8" y1="9" x2="16" y2="9" />
    <line x1="8" y1="13" x2="16" y2="13" />
    <line x1="8" y1="17" x2="13" y2="17" />
  </svg>
);

const IcoEdit = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const IcoInbox = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
    <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
  </svg>
);

const IcoEye = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const IcoEyeOff = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

const IcoTrash = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);

function EcosystemFormularios() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { showToast, showError, currentUser } = useAppContext();
  const [showGuide, setShowGuide] = useState(false);

  const isAdmin = ["admin", "owner", "superadmin"].includes((currentUser?.role ?? "").toLowerCase());

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["form-templates"],
    queryFn: formService.list,
  });

  const deleteMutation = useMutation({
    mutationFn: formService.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["form-templates"] });
      showToast(t("forms.deleted"));
    },
    onError: (err) => showError(err, t("forms.deleteError")),
  });

  const toggleMutation = useMutation({
    mutationFn: formService.togglePublish,
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["form-templates"] });
      showToast(updated.is_published ? t("forms.publishedToast") : t("forms.unpublishedToast"));
    },
    onError: (err) => showError(err, t("forms.statusError")),
  });

  const copyLink = (slug) => {
    const url = `${window.location.origin}/f/${slug}`;
    navigator.clipboard.writeText(url).then(() => showToast(t("forms.linkCopied")));
  };

  const handleDelete = (template) => {
    if (!window.confirm(t("forms.deleteConfirm").replace("{name}", template.name))) return;
    deleteMutation.mutate(template.id);
  };

  if (isLoading) {
    return (
      <EcoLayout active="formularios" title={t("forms.title")} subtitle={t("forms.subtitle")}>
        <div className="usr-empty">{t("forms.loading")}</div>
      </EcoLayout>
    );
  }

  return (
    <EcoLayout
      active="formularios"
      title={t("forms.title")}
      subtitle={t("forms.subtitle")}
      onGuide={() => setShowGuide(true)}
    >
      <div className="section-head">
        <h3>{t("forms.heading")}</h3>
        {isAdmin && (
          <button className="usr-add-btn" onClick={() => navigate("/ecosistema/formularios/nuevo")}>
            {t("forms.newForm")}
          </button>
        )}
      </div>

      {templates.length === 0 ? (
        <div className="usr-rows-empty" style={{ padding: "52px 24px", textAlign: "center" }}>
          <svg width="72" height="72" viewBox="0 0 72 72" fill="none" style={{ marginBottom: 18, opacity: .9 }}>
            <circle cx="36" cy="36" r="36" fill="rgba(111,175,107,.07)" />
            <rect x="20" y="14" width="32" height="44" rx="4" stroke="rgba(111,175,107,.45)" strokeWidth="1.6" />
            <path d="M28 14v3h16v-3" stroke="rgba(111,175,107,.45)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="27" y1="29" x2="45" y2="29" stroke="rgba(111,175,107,.35)" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="27" y1="36" x2="45" y2="36" stroke="rgba(111,175,107,.35)" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="27" y1="43" x2="37" y2="43" stroke="rgba(111,175,107,.35)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--deep)", marginBottom: 6 }}>{t("forms.noForms")}</div>
          <div style={{ fontSize: 12.5, color: "var(--text3)", maxWidth: 340, margin: "0 auto", lineHeight: 1.6, marginBottom: isAdmin ? 20 : 0 }}>
            {t("forms.noFormsText")}
          </div>
          {isAdmin && (
            <button className="usr-add-btn" onClick={() => navigate("/ecosistema/formularios/nuevo")}>
              {t("forms.firstForm")}
            </button>
          )}
        </div>
      ) : (
        <div className="fom-grid">
          {templates.map((template) => {
            const link = `${window.location.origin}/f/${template.slug}`;
            return (
              <div key={template.id} className="fom-card">
                <div className="fom-card-head">
                  <div className="fom-card-ico"><FormIco /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="fom-card-name">{template.name}</div>
                    <span className={`app-status ${template.is_published ? "st-active" : "st-soon"}`}>
                      {template.is_published ? t("forms.published") : t("forms.draft")}
                    </span>
                  </div>
                </div>

                <div className="fom-card-desc">
                  {template.description || <span style={{ fontStyle: "italic" }}>{t("forms.noDescription")}</span>}
                </div>

                <div className="fom-meta">
                  <span className="fom-badge">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                      <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                    </svg>
                    {t("forms.fieldsCount").replace("{count}", (template.fields ?? []).length)}
                  </span>
                  <span className="fom-badge">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    {t("forms.responsesCount").replace("{count}", template.submission_count ?? 0)}
                  </span>
                </div>

                {template.is_published && (
                  <div className="fom-link-row">
                    <span className="fom-link-text">{link}</span>
                    <button className="fom-copy-btn" onClick={() => copyLink(template.slug)}>{t("forms.copyLink")}</button>
                  </div>
                )}

                <div className="fom-actions">
                  {isAdmin && (
                    <button className="fom-action" onClick={() => navigate(`/ecosistema/formularios/${template.id}/editar`)}>
                      <IcoEdit /> {t("forms.edit")}
                    </button>
                  )}
                  <button className="fom-action" onClick={() => navigate(`/ecosistema/formularios/${template.id}/respuestas`)}>
                    <IcoInbox /> {t("forms.responses")}
                  </button>
                  {isAdmin && (
                    <button
                      className="fom-action"
                      onClick={() => toggleMutation.mutate(template.id)}
                      disabled={toggleMutation.isPending}
                    >
                      {template.is_published ? <><IcoEyeOff /> {t("forms.unpublish")}</> : <><IcoEye /> {t("forms.publish")}</>}
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      className="fom-action danger"
                      onClick={() => handleDelete(template)}
                      disabled={deleteMutation.isPending}
                      title={t("forms.deleteForm")}
                    >
                      <IcoTrash />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <GuideModal
        open={showGuide}
        onClose={() => setShowGuide(false)}
        title={t("forms.guideTitle")}
        subtitle={t("forms.guideSubtitle")}
        steps={[
          { title: t("forms.guide.createTitle"), text: t("forms.guide.createText") },
          { title: t("forms.guide.shareTitle"), text: t("forms.guide.shareText") },
          { title: t("forms.guide.receiveTitle"), text: t("forms.guide.receiveText") },
          { title: t("forms.guide.exportTitle"), text: t("forms.guide.exportText") },
        ]}
      />
    </EcoLayout>
  );
}

export default EcosystemFormularios;
