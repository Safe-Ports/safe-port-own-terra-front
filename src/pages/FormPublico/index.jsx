import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { formService } from "@/services/formService";
import { parseApiError } from "@/errors/parseApiError";
import "./FormPublico.css";

function FormPublico() {
  const { pathname } = useLocation();
  const slug = pathname.replace(/^\/f\//, "").split("/")[0];

  const [phase, setPhase] = useState("loading"); // loading | form | success | unavailable
  const [template, setTemplate] = useState(null);
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!slug) { setPhase("unavailable"); return; }
    formService.publicGet(slug)
      .then((data) => {
        setTemplate(data);
        const init = {};
        (data.fields ?? []).forEach((f) => { init[f.id] = ""; });
        setValues(init);
        setPhase("form");
      })
      .catch(() => setPhase("unavailable"));
  }, [slug]);

  const validate = () => {
    const errs = {};
    (template?.fields ?? []).forEach((f) => {
      if (f.required && !values[f.id]?.trim()) errs[f.id] = "Este campo es obligatorio";
    });
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSubmitting(true);
    setErrors({});
    try {
      await formService.publicSubmit(slug, { data: values });
      setPhase("success");
    } catch (err) {
      const parsed = parseApiError(err, "No fue posible enviar el formulario.");
      setErrors({ __global: parsed });
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (fieldId, value) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
    if (errors[fieldId]) setErrors((prev) => { const next = { ...prev }; delete next[fieldId]; return next; });
  };

  return (
    <div className="fp-root">
      <div className="fp-header">
        {template?.logo_url ? (
          <img className="fp-logo" src={template.logo_url} alt="Logo" />
        ) : (
          <img
            className="fp-logo"
            src="/ownterra ecosistem.png"
            alt="OwnTerra"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        )}
      </div>

      {phase === "loading" && (
        <div className="fp-card fp-loading">
          <div className="fp-spinner" />
        </div>
      )}

      {phase === "unavailable" && (
        <div className="fp-card">
          <div className="fp-unavail">
            <div className="fp-unavail-icon">🔒</div>
            <div className="fp-unavail-title">Formulario no disponible</div>
            <div className="fp-unavail-sub">
              Este formulario no existe o no está habilitado por el momento. Contacta al equipo si crees que esto es un error.
            </div>
          </div>
        </div>
      )}

      {phase === "success" && (
        <div className="fp-card">
          <div className="fp-success">
            <div className="fp-success-icon">
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                <circle cx="32" cy="32" r="30" stroke="#6FAF6B" strokeWidth="1.6" fill="rgba(111,175,107,.07)" />
                <polyline points="20,33 28,41 44,24" stroke="#6FAF6B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </div>
            <div className="fp-success-title">¡Información enviada!</div>
            <div className="fp-success-sub">
              Tus datos han sido registrados correctamente.<br />
              En breve el equipo se pondrá en contacto contigo.
            </div>
          </div>
        </div>
      )}

      {phase === "form" && template && (
        <div className="fp-card">
          <div className="fp-title">{template.name}</div>
          {template.description && <div className="fp-desc">{template.description}</div>}
          <div className="fp-divider" />

          <form onSubmit={handleSubmit} noValidate>
            {errors.__global && (
              <div className="fp-global-error">
                <div>{errors.__global.message}</div>
                <div className="fp-error-ref">
                  {errors.__global.code} · Ref: {errors.__global.requestId ?? "—"}
                  <button
                    type="button"
                    className="fp-error-copy"
                    onClick={() => navigator.clipboard.writeText(`${errors.__global.code} · Ref: ${errors.__global.requestId ?? "—"}`)}
                  >
                    Copiar
                  </button>
                </div>
              </div>
            )}

            <div className="fp-fields">
              {(template.fields ?? []).map((f) => (
                <div key={f.id} className="fp-field">
                  <label className="fp-label" htmlFor={`fp-${f.id}`}>
                    {f.label}
                    {f.required && <span className="fp-required">*</span>}
                  </label>
                  {f.description && <div className="fp-hint">{f.description}</div>}
                  <input
                    id={`fp-${f.id}`}
                    className={`fp-input${errors[f.id] ? " error" : ""}`}
                    value={values[f.id] ?? ""}
                    onChange={(e) => handleChange(f.id, e.target.value)}
                    placeholder={`Escribe ${f.label.toLowerCase()}`}
                    autoComplete="off"
                  />
                  {errors[f.id] && <div className="fp-error">{errors[f.id]}</div>}
                </div>
              ))}
            </div>

            <button className="fp-submit" type="submit" disabled={submitting}>
              {submitting ? "Enviando…" : "Enviar información"}
            </button>
          </form>

          <div className="fp-footer">
            Tus datos están protegidos y no se comparten con terceros.
          </div>
        </div>
      )}
    </div>
  );
}

export default FormPublico;
