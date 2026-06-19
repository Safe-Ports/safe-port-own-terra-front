import { Component } from "react";
import { Sentry } from "@/observability/sentry";
import { getErrorMeta, UI_CODE } from "@/errors/catalog";
import { localRef, errorClipboardText } from "@/errors/parseApiError";

/**
 * Captura crashes de render de React. Los homologa como OT-UI-9001 con una Ref local,
 * los reporta a Sentry con tags `code` + `request_id`, y muestra una pantalla amigable
 * con el código + Ref + botón copiar (mismo contrato que los errores de API).
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, requestId: null, copied: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true, requestId: localRef() };
  }

  componentDidCatch(error, info) {
    const requestId = this.state.requestId || localRef();
    Sentry.captureException(error, {
      level: "error",
      tags: { code: UI_CODE, request_id: requestId, source: "ui" },
      extra: { componentStack: info?.componentStack },
    });
  }

  copy = async () => {
    const meta = getErrorMeta(UI_CODE);
    try {
      await navigator.clipboard.writeText(
        errorClipboardText({ code: meta.code, requestId: this.state.requestId })
      );
      this.setState({ copied: true });
      window.setTimeout(() => this.setState({ copied: false }), 1500);
    } catch {
      /* clipboard no disponible */
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const meta = getErrorMeta(UI_CODE);
    return (
      <div style={styles.wrap}>
        <div style={styles.card}>
          <div style={styles.title}>⚠ Algo se rompió en la pantalla</div>
          <p style={styles.msg}>{meta.message}</p>
          <p style={styles.action}>{meta.action}</p>
          <div style={styles.meta}>
            <code style={styles.code}>
              {meta.code}{this.state.requestId ? ` · ${this.state.requestId}` : ""}
            </code>
            <button type="button" style={styles.copy} onClick={this.copy}>
              {this.state.copied ? "¡Copiado!" : "Copiar"}
            </button>
          </div>
          <button type="button" style={styles.reload} onClick={() => window.location.reload()}>
            Recargar la página
          </button>
        </div>
      </div>
    );
  }
}

const styles = {
  wrap: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    fontFamily: "system-ui, sans-serif",
    background: "#16120f",
  },
  card: {
    maxWidth: 420,
    width: "100%",
    background: "#1c1612",
    border: "1px solid rgba(220,120,90,0.4)",
    borderRadius: 14,
    padding: 20,
    color: "#E9E5DB",
  },
  title: { fontWeight: 700, fontSize: "1rem", marginBottom: 8 },
  msg: { fontSize: "0.9rem", lineHeight: 1.4, margin: "0 0 6px" },
  action: { fontSize: "0.82rem", color: "#C9C2B4", margin: "0 0 14px" },
  meta: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingTop: 12,
    borderTop: "1px solid rgba(233,229,219,0.12)",
  },
  code: { fontSize: "0.74rem", fontFamily: "ui-monospace, monospace", color: "#B7AE9E" },
  copy: {
    border: "1px solid rgba(233,229,219,0.24)",
    background: "transparent",
    color: "#E9E5DB",
    borderRadius: 8,
    padding: "5px 10px",
    fontSize: "0.74rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  reload: {
    marginTop: 14,
    width: "100%",
    border: "none",
    background: "#C9772E",
    color: "#fff",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: "0.86rem",
    fontWeight: 700,
    cursor: "pointer",
  },
};

export default ErrorBoundary;
