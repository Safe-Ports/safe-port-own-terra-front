import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HiArrowLeftOnRectangle, HiArrowRightOnRectangle, HiCamera, HiCheckCircle, HiNoSymbol, HiQrCode, HiShieldCheck, HiXCircle } from "react-icons/hi2";
import propertiesService from "@/services/propertiesService";
import { useAppContext } from "@/context/AppContext";
import { usePropertiesData } from "../../data/PropertiesDataContext";
import VisitorPassForm from "./VisitorPassForm";
import { ACCESS_POINT_KINDS, DENIAL_REASON, accessPointKindLabel, newClientEventId, passWindowText, visitorTypeLabel } from "./accessModel";
import "./visitor-access.css";

const failureText = (failure) => failure?.response?.data?.error?.message || failure?.message || "No pudimos completar la acción.";
const clock = (value) => new Date(value).toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

/* Lee un QR con la cámara donde el navegador trae BarcodeDetector (Chrome, Android).
   En los demás, la caseta usa un lector USB/Bluetooth que escribe en el campo. */
function CameraScanner({ onCode, onClose }) {
  const videoRef = useRef(null);
  const onCodeRef = useRef(onCode);
  onCodeRef.current = onCode;
  const [error, setError] = useState("");
  useEffect(() => {
    let stream; let frame; let stopped = false;
    const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        videoRef.current.srcObject = stream; await videoRef.current.play();
        const tick = async () => {
          if (stopped) return;
          try { const [code] = await detector.detect(videoRef.current); if (code?.rawValue) { onCodeRef.current(code.rawValue); return; } } catch { /* cuadro sin código */ }
          frame = requestAnimationFrame(tick);
        };
        tick();
      } catch { setError("No pudimos abrir la cámara. Revisa el permiso o usa el lector."); }
    })();
    return () => { stopped = true; cancelAnimationFrame(frame); stream?.getTracks().forEach((track) => track.stop()); };
  }, []);
  return <div className="va-camera"><video ref={videoRef} muted playsInline aria-label="Vista de la cámara"/>{error ? <p role="alert">{error}</p> : <p>Apunta al código del pase.</p>}<button type="button" onClick={onClose}>Cerrar cámara</button></div>;
}

/** Visitas con QR conectadas a properties-back: caseta, pases, bitácora y entradas. */
function VisitorAccessPanel() {
  const { showToast, canUseFeature } = useAppContext();
  const canWrite = canUseFeature ? canUseFeature("properties.write") : true;
  const { communities, units } = usePropertiesData();
  const queryClient = useQueryClient();
  const [communityId, setCommunityId] = useState(communities[0]?.id || "");
  const community = communities.find((item) => item.id === communityId) || communities[0];
  const communityUnits = units.filter((unit) => unit.propertyId === community?.propertyId && unit.status !== "archived");
  const unitLabel = (id) => units.find((unit) => unit.id === id)?.identifier || "";

  const pointsKey = ["properties", "access-points", community?.id];
  const eventsKey = ["properties", "access-events", community?.id];
  const points = useQuery({ queryKey: pointsKey, enabled: Boolean(community), queryFn: () => propertiesService.access.points(community.id), retry: false });
  const events = useQuery({ queryKey: eventsKey, enabled: Boolean(community), queryFn: () => propertiesService.access.events(community.id), retry: false, refetchInterval: 30_000 });
  const activePoints = (points.data || []).filter((point) => point.is_active);
  const pointName = (id) => (points.data || []).find((point) => point.id === id)?.name || "Entrada";

  // Caseta
  const [pointId, setPointId] = useState("");
  const [direction, setDirection] = useState("in");
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);
  const [camera, setCamera] = useState(false);
  const [seen, setSeen] = useState({}); // client_event_id → visitante (la bitácora del backend sólo trae ids)
  const currentPoint = pointId || activePoints[0]?.id || "";
  const codeRef = useRef(null);
  const hasCamera = typeof window !== "undefined" && "BarcodeDetector" in window && Boolean(navigator.mediaDevices?.getUserMedia);

  const validate = async (token) => {
    const value = (token ?? code).trim();
    if (!value || !currentPoint || checking) return;
    setChecking(true); setCamera(false);
    const clientEventId = newClientEventId();
    try {
      const response = await propertiesService.access.validate({ qr_token: value, access_point_id: currentPoint, direction, client_event_id: clientEventId });
      setResult({ ...response, direction });
      if (response.visitor) setSeen((current) => ({ ...current, [clientEventId]: response.visitor }));
      queryClient.invalidateQueries({ queryKey: eventsKey });
    } catch (failure) {
      setResult({ decision: "error", message: failureText(failure) });
    } finally { setChecking(false); setCode(""); codeRef.current?.focus(); }
  };

  // Pases
  const [created, setCreated] = useState([]); // pases de esta sesión (para poder revocarlos)
  const revoke = async (row) => {
    try {
      await propertiesService.access.revoke(row.credentialId, "Cancelado por la administración");
      setCreated((current) => current.map((item) => item.credentialId === row.credentialId ? { ...item, status: "revoked" } : item));
      showToast(`Pase de ${row.fullName} cancelado`, "success");
    } catch (failure) { showToast(failureText(failure), "warning"); }
  };

  // Entradas
  const [pointDraft, setPointDraft] = useState({ name: "", kind: "pedestrian" });
  const [addingPoint, setAddingPoint] = useState(false);
  const createPoint = async (event) => {
    event.preventDefault();
    if (!pointDraft.name.trim()) return;
    setAddingPoint(true);
    try {
      const row = await propertiesService.access.createPoint(community.id, { name: pointDraft.name.trim(), kind: pointDraft.kind });
      setPointDraft({ name: "", kind: "pedestrian" }); setPointId(row.id);
      await queryClient.invalidateQueries({ queryKey: pointsKey });
      showToast(`Entrada "${row.name}" lista`, "success");
    } catch (failure) { showToast(failureText(failure), "warning"); }
    finally { setAddingPoint(false); }
  };

  if (!communities.length) return null;
  const granted = result?.decision === "granted";
  const resultReason = result && !granted ? (DENIAL_REASON[result.reason_code] || result.visitor?.message || result.message || "No se permite el paso.") : "";

  return <section className="va-panel" aria-label="Visitas con QR">
    <header className="va-head">
      <div><span>Seguridad</span><h2>Visitas con QR</h2><p>Crea pases, valida en caseta y consulta la bitácora. Todo intento queda registrado.</p></div>
      {communities.length > 1 ? <label><small>Comunidad</small><select value={community?.id || ""} onChange={(event) => { setCommunityId(event.target.value); setPointId(""); setResult(null); }}>{communities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label> : null}
    </header>

    <div className="va-grid">
      <article className="va-card va-gate" aria-label="Validar en caseta">
        <header><HiShieldCheck/><div><strong>Caseta</strong><small>Escanea el pase o pega el código</small></div></header>
        {!activePoints.length && !points.isLoading ? <p className="va-hint">Primero da de alta una entrada (abajo) para poder validar.</p> : <>
          <div className="va-gate-controls">
            <label><small>Entrada</small><select value={currentPoint} onChange={(event) => setPointId(event.target.value)}>{activePoints.map((point) => <option key={point.id} value={point.id}>{point.name}</option>)}</select></label>
            <div className="va-direction" role="radiogroup" aria-label="Sentido">
              <button type="button" role="radio" aria-checked={direction === "in"} onClick={() => setDirection("in")}><HiArrowRightOnRectangle/> Entrada</button>
              <button type="button" role="radio" aria-checked={direction === "out"} onClick={() => setDirection("out")}><HiArrowLeftOnRectangle/> Salida</button>
            </div>
          </div>
          <form className="va-scan" onSubmit={(event) => { event.preventDefault(); validate(); }}>
            <input ref={codeRef} value={code} onChange={(event) => setCode(event.target.value)} placeholder="Código del pase" aria-label="Código del pase" autoComplete="off"/>
            <button type="submit" disabled={!code.trim() || checking}>{checking ? "Validando…" : "Validar"}</button>
            {hasCamera ? <button type="button" className="va-camera-open" onClick={() => setCamera(true)} aria-label="Escanear con la cámara"><HiCamera/></button> : null}
          </form>
          {camera ? <CameraScanner onCode={(value) => validate(value)} onClose={() => setCamera(false)}/> : null}
          {result ? <div className={`va-result is-${granted ? "granted" : "denied"}`} role="status" aria-live="assertive">
            {granted ? <HiCheckCircle/> : <HiXCircle/>}
            <div>
              <strong>{granted ? (result.direction === "out" ? "Salida registrada" : "Puede pasar") : result.decision === "error" ? "No se pudo validar" : "No puede pasar"}</strong>
              {result.visitor ? <span>{result.visitor.full_name}{result.visitor.property_label ? ` · ${result.visitor.property_label}` : ""}</span> : null}
              {!granted ? <span>{resultReason}</span> : null}
            </div>
          </div> : null}
        </>}
      </article>

      <article className="va-card" aria-label="Crear pase">
        <header><HiQrCode/><div><strong>Nuevo pase</strong><small>El QR se muestra una sola vez</small></div></header>
        <VisitorPassForm key={community?.id} communityId={community?.id} units={communityUnits} canWrite={canWrite} onCreated={(row) => setCreated((current) => [{ ...row, qrToken: undefined, status: "active" }, ...current])}/>
        {created.length ? <ul className="va-created" aria-label="Pases creados en esta sesión">{created.map((row) => <li key={row.credentialId}>
          <div><strong>{row.fullName}</strong><small>{visitorTypeLabel(row.visitorType)} · {unitLabel(row.propertyId)} · {passWindowText(row.validFrom, row.validUntil)}</small></div>
          {row.status === "revoked" ? <i>Cancelado</i> : <button type="button" onClick={() => revoke(row)} disabled={!canWrite}><HiNoSymbol/> Cancelar</button>}
        </li>)}</ul> : null}
      </article>
    </div>

    <div className="va-grid">
      <article className="va-card" aria-label="Bitácora de caseta">
        <header><HiShieldCheck/><div><strong>Bitácora</strong><small>Entradas, salidas e intentos negados</small></div></header>
        {events.isLoading ? <p className="va-hint">Cargando…</p> : null}
        {events.error ? <p className="va-hint" role="alert">{failureText(events.error)}</p> : null}
        {!events.isLoading && !events.error && !(events.data || []).length ? <p className="va-hint">Sin movimientos todavía.</p> : null}
        <ul className="va-log">{(events.data || []).slice(0, 30).map((event) => { const who = seen[event.client_event_id]; return <li key={event.id} className={`is-${event.decision}`}>
          <i>{event.decision === "granted" ? <HiCheckCircle/> : <HiXCircle/>}</i>
          <div><strong>{who ? who.full_name : event.decision === "granted" ? "Acceso permitido" : "Acceso negado"}</strong><small>{event.direction === "in" ? "Entrada" : "Salida"} · {pointName(event.access_point_id)}{event.reason_code ? ` · ${DENIAL_REASON[event.reason_code] || event.reason_code}` : ""}</small></div>
          <time>{clock(event.occurred_at)}</time>
        </li>; })}</ul>
      </article>

      <article className="va-card" aria-label="Entradas de la comunidad">
        <header><HiArrowRightOnRectangle/><div><strong>Entradas</strong><small>Puertas o casetas donde se valida</small></div></header>
        <ul className="va-points">{(points.data || []).map((point) => <li key={point.id}><strong>{point.name}</strong><small>{accessPointKindLabel(point.kind)}{point.is_active ? "" : " · Inactiva"}</small></li>)}</ul>
        <form className="va-point-form" onSubmit={createPoint}>
          <input value={pointDraft.name} onChange={(event) => setPointDraft({ ...pointDraft, name: event.target.value })} placeholder="Ej. Caseta principal" aria-label="Nombre de la entrada" maxLength={120}/>
          <select value={pointDraft.kind} onChange={(event) => setPointDraft({ ...pointDraft, kind: event.target.value })} aria-label="Tipo de entrada">{ACCESS_POINT_KINDS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
          <button type="submit" disabled={!pointDraft.name.trim() || addingPoint || !canWrite}>{addingPoint ? "Guardando…" : "Agregar"}</button>
        </form>
      </article>
    </div>
  </section>;
}

export default VisitorAccessPanel;
