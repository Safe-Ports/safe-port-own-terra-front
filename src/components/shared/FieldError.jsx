// Mensaje de error de validación que va DEBAJO de un campo (capa de "llenado").
// Distinto de los errores de catálogo OT-… (esos usan ErrorToast/InlineError).
function FieldError({ msg }) {
  if (!msg) return null;
  return (
    <span
      role="alert"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        fontSize: ".72rem",
        color: "var(--danger, #c0392b)",
        marginTop: 4,
        fontWeight: 500,
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      {msg}
    </span>
  );
}

export default FieldError;
