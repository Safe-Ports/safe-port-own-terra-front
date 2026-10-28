import { useState } from "react";
import { HiPlus } from "react-icons/hi2";
import propertiesService from "@/services/propertiesService";
import { useAppContext } from "@/context/AppContext";
import QrPass from "./QrPass";
import { VISITOR_TYPES, defaultWindow, validateVisitor, visitorBody } from "./accessModel";
import "./visitor-access.css";

const failureText = (failure) => failure?.response?.data?.error?.message || failure?.message || "No pudimos completar la acción.";
const blankPass = (propertyId = "") => ({ propertyId, fullName: "", visitorType: "guest", phone: "", vehiclePlate: "", documentHint: "", maxEntries: 1, ...defaultWindow() });

/* Formulario de pase provisional con QR. Con `fixedUnit` el pase sale de la
   ficha de esa unidad y no pregunta a dónde va; sin él, se elige de `units`. */
function VisitorPassForm({ communityId, units = [], fixedUnit = null, canWrite = true, onCreated, onDone }) {
  const { showToast } = useAppContext();
  const [draft, setDraft] = useState(() => blankPass(fixedUnit?.id));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [pass, setPass] = useState(null);
  const set = (key) => (event) => setDraft({ ...draft, [key]: event.target.value });
  const unitLabel = (id) => fixedUnit?.id === id ? fixedUnit.identifier : units.find((unit) => unit.id === id)?.identifier || "";

  const createPass = async (event) => {
    event.preventDefault();
    const found = validateVisitor(draft);
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    try {
      const response = await propertiesService.access.createVisitor(communityId, visitorBody(draft));
      const row = { ...draft, qrToken: response.qr_token, credentialId: response.credential_id, validUntil: response.valid_until || draft.validUntil };
      setPass(row);
      onCreated?.(row);
      setDraft(blankPass(fixedUnit?.id));
    } catch (failure) { showToast(failureText(failure), "warning"); }
    finally { setSaving(false); }
  };

  if (pass) return <QrPass pass={pass} place={unitLabel(pass.propertyId)} onDone={() => { setPass(null); onDone?.(); }}/>;
  return <form className="va-form" onSubmit={createPass} noValidate>
    <label className="wide"><small>Nombre de quien viene</small><input value={draft.fullName} maxLength={160} onChange={set("fullName")} aria-invalid={Boolean(errors.fullName)} autoFocus={Boolean(fixedUnit)}/>{errors.fullName ? <em>{errors.fullName}</em> : null}</label>
    {fixedUnit ? null : <label><small>Unidad que recibe</small><select value={draft.propertyId} onChange={set("propertyId")} aria-invalid={Boolean(errors.propertyId)}><option value="">Elige…</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.identifier}</option>)}</select>{errors.propertyId ? <em>{errors.propertyId}</em> : null}</label>}
    <label><small>Tipo</small><select value={draft.visitorType} onChange={set("visitorType")}>{VISITOR_TYPES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
    <label><small>Desde</small><input type="datetime-local" value={draft.validFrom} onChange={set("validFrom")}/></label>
    <label><small>Hasta</small><input type="datetime-local" value={draft.validUntil} onChange={set("validUntil")} aria-invalid={Boolean(errors.validUntil)}/>{errors.validUntil ? <em>{errors.validUntil}</em> : null}</label>
    <label><small>Placas</small><input value={draft.vehiclePlate} maxLength={15} onChange={set("vehiclePlate")}/></label>
    <label><small>Identificación (últimos 4)</small><input value={draft.documentHint} maxLength={4} onChange={set("documentHint")} inputMode="text"/></label>
    <label><small>Entradas</small><input type="number" min="1" max="50" value={draft.maxEntries} onChange={set("maxEntries")} aria-invalid={Boolean(errors.maxEntries)}/>{errors.maxEntries ? <em>{errors.maxEntries}</em> : null}</label>
    <button type="submit" className="va-primary" disabled={saving || !canWrite}><HiPlus/> {saving ? "Creando…" : "Crear pase"}</button>
  </form>;
}

export default VisitorPassForm;
