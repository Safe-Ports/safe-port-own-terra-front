import useConfirmation from "@/hooks/useConfirmation";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import GuideModal from "@/components/shared/GuideModal";
import EcoLayout from "../EcoLayout";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { formService } from "@/services/formService";
import { useAppContext } from "@/context/AppContext";
import { isGlobalAdmin } from "@/services/permissions";

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

const IcoWhatsapp = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.33 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm5.8 14.14c-.24.68-1.4 1.3-1.93 1.37-.5.07-1.12.1-1.8-.11a16.6 16.6 0 0 1-1.65-.6c-2.9-1.25-4.78-4.17-4.93-4.36-.14-.2-1.18-1.57-1.18-3 0-1.42.75-2.12 1.01-2.4.26-.29.58-.36.77-.36l.55.01c.18.01.42-.07.65.5.24.58.8 2 .87 2.15.07.15.12.32.02.51-.1.2-.15.32-.3.49-.14.17-.3.38-.43.51-.14.14-.3.3-.13.58.17.29.76 1.26 1.64 2.04 1.13.99 2.08 1.3 2.37 1.45.29.14.46.12.63-.07.17-.19.72-.84.92-1.13.19-.29.38-.24.64-.14.26.1 1.63.77 1.91.91.29.14.47.21.54.33.07.12.07.68-.17 1.36z"/>
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
  const { requestConfirmation, confirmationDialog } = useConfirmation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { showToast, showError, currentUser } = useAppContext();
  const [showGuide, setShowGuide] = useState(false);

  const isAdmin = isGlobalAdmin(currentUser);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["form-templates"],
    queryFn: formService.list,
  });

  const deleteMutation = useMutation({
    mutationFn: formService.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["form-templates"] });
      showToast("Formulario eliminado");
    },
    onError: (err) => showError(err, "Error al eliminar"),
  });

  const toggleMutation = useMutation({
    mutationFn: formService.togglePublish,
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["form-templates"] });
      showToast(updated.is_published ? "Formulario publicado" : "Formulario despublicado");
    },
    onError: (err) => showError(err, "Error al cambiar estado"),
  });

  const copyLink = (slug) => {
    const url = `${window.location.origin}/f/${slug}`;
    navigator.clipboard.writeText(url).then(() => showToast("Link copiado al portapapeles"));
  };

  const shareWhatsapp = (t) => {
    const url = `${window.location.origin}/f/${t.slug}`;
    const text = `Por favor completa este formulario — ${t.name}: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  };

  const handleDelete = async (t) => {
    if (!await requestConfirmation("También se borran todas sus respuestas y el enlace público deja de funcionar.", { title: `¿Eliminar "${t.name}"?`, confirmLabel: "Eliminar formulario", danger: true })) return;
    deleteMutation.mutate(t.id);
  };

  if (isLoading) {
    return (
      <EcoLayout active="formularios" title="Formularios" subtitle="Captura de datos para compradores e interesados">{confirmationDialog}
        <SkeletonRows rows={5} />
      </EcoLayout>
    );
  }

  return (
    <EcoLayout
      active="formularios"
      title="Formularios"
      subtitle="Captura de datos para compradores e interesados"
      onGuide={() => setShowGuide(true)}
    >{confirmationDialog}
      <div className="section-head">
        <h3>Formularios de captura</h3>
        {isAdmin && (
          <button className="usr-add-btn" onClick={() => navigate("/ecosistema/formularios/nuevo")}>
            + Nuevo formulario
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
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--deep)", marginBottom: 6 }}>Sin formularios aún</div>
          <div style={{ fontSize: 12.5, color: "var(--text3)", maxWidth: 340, margin: "0 auto", lineHeight: 1.6, marginBottom: isAdmin ? 20 : 0 }}>
            Crea tu primer formulario para capturar datos de compradores e interesados y compártelo vía link.
          </div>
          {isAdmin && (
            <button className="usr-add-btn" onClick={() => navigate("/ecosistema/formularios/nuevo")}>
              Crear primer formulario
            </button>
          )}
        </div>
      ) : (
        <div className="fom-grid">
          {templates.map((t) => {
            const link = `${window.location.origin}/f/${t.slug}`;
            return (
              <div key={t.id} className="fom-card">
                <div className="fom-card-head">
                  <div className="fom-card-ico"><FormIco /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="fom-card-name">{t.name}</div>
                    <span className={`app-status ${t.is_published ? "st-active" : "st-soon"}`}>
                      {t.is_published ? "Publicado" : "Borrador"}
                    </span>
                  </div>
                </div>

                <div className="fom-card-desc">
                  {t.description || <span style={{ fontStyle: "italic" }}>Sin descripción</span>}
                </div>

                <div className="fom-meta">
                  <span className="fom-badge">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                      <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                    </svg>
                    {(t.fields ?? []).length} campo{(t.fields ?? []).length !== 1 ? "s" : ""}
                  </span>
                  <span className="fom-badge">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    {t.submission_count ?? 0} respuesta{(t.submission_count ?? 0) !== 1 ? "s" : ""}
                  </span>
                </div>

                {t.is_published && (
                  <div className="fom-link-row">
                    <span className="fom-link-text">{link}</span>
                    <button className="fom-copy-btn" onClick={() => copyLink(t.slug)}>Copiar link</button>
                    <button className="fom-copy-btn fom-wa-btn" onClick={() => shareWhatsapp(t)}>
                      <IcoWhatsapp /> WhatsApp
                    </button>
                  </div>
                )}

                <div className="fom-actions">
                  {isAdmin && (
                    <button className="fom-action" onClick={() => navigate(`/ecosistema/formularios/${t.id}/editar`)}>
                      <IcoEdit /> Editar
                    </button>
                  )}
                  <button className="fom-action" onClick={() => navigate(`/ecosistema/formularios/${t.id}/respuestas`)}>
                    <IcoInbox /> Respuestas
                  </button>
                  {isAdmin && (
                    <button
                      className="fom-action"
                      onClick={() => toggleMutation.mutate(t.id)}
                      disabled={toggleMutation.isPending}
                    >
                      {t.is_published ? <><IcoEyeOff /> Despublicar</> : <><IcoEye /> Publicar</>}
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      className="fom-action danger"
                      onClick={() => handleDelete(t)}
                      disabled={deleteMutation.isPending}
                      title="Eliminar formulario"
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
        title="Formularios del ecosistema"
        subtitle="Captura datos de compradores e interesados con links compartibles."
        steps={[
          { title: "Crear formulario", text: "El administrador define el nombre, descripción y campos personalizados. Cada campo puede ser obligatorio u opcional." },
          { title: "Publicar y compartir", text: "Al publicar se genera un link único (/f/...) que puedes enviar por WhatsApp, correo o cualquier canal sin que el destinatario tenga cuenta." },
          { title: "Recibir respuestas", text: "Los interesados llenan el formulario sin necesidad de registrarse. Las respuestas se acumulan aquí en tiempo real." },
          { title: "Exportar datos", text: "Desde la vista de Respuestas puedes ver todos los datos capturados en tabla y exportarlos a CSV con un clic." },
        ]}
      />
    </EcoLayout>
  );
}

export default EcosystemFormularios;
