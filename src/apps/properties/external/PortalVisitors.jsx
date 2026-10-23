import { useState } from "react";
import { HiQrCode } from "react-icons/hi2";
import propertiesPortalService from "@/services/propertiesPortalService";
import QrPass from "../features/access/QrPass";
import { VISITOR_TYPES, defaultWindow, validateVisitor, visitorBody } from "../features/access/accessModel";
import "./portal-tickets.css";

const blank = () => ({ propertyId: "", fullName: "", visitorType: "guest", phone: "", vehiclePlate: "", maxEntries: 1, ...defaultWindow() });

/** El residente registra a quien viene y comparte el QR para que entre por caseta. */
function PortalVisitors({ units = [] }) {
  const [draft, setDraft] = useState(blank);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState("");
  const [pass, setPass] = useState(null);
  const propertyId = draft.propertyId || units[0]?.id || "";
  const set = (key) => (event) => setDraft({ ...draft, [key]: event.target.value });

  const submit = async (event) => {
    event.preventDefault();
    const found = validateVisitor({ ...draft, propertyId });
    setErrors(found); setFailure("");
    if (Object.keys(found).length) return;
    setSaving(true);
    try {
      const created = await propertiesPortalService.createVisitor(visitorBody({ ...draft, propertyId }));
      setPass({ ...draft, propertyId, qrToken: created.qr_token, credentialId: created.credential_id, validUntil: created.valid_until || draft.validUntil });
      setDraft(blank());
    } catch (error) {
      setFailure(error.response?.data?.error?.message || "No pudimos crear el pase. Intenta de nuevo.");
    } finally { setSaving(false); }
  };

  const place = units.find((unit) => unit.id === pass?.propertyId)?.label;
  return <section className="community-section portal-tickets portal-visitors">
    <header><div><span>Visitas</span><p>Registra a quien viene y compártele su pase. En caseta sólo escanean el código.</p></div></header>

    {pass ? <div className="portal-visitors-pass"><QrPass pass={pass} place={place} onDone={() => setPass(null)}/></div> : <form className="portal-tickets-form" onSubmit={submit} noValidate aria-label="Registrar visita">
      {units.length > 1 ? <label><span>Unidad</span><select value={propertyId} onChange={set("propertyId")}>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.label}</option>)}</select></label> : null}
      <label><span>Tipo</span><select value={draft.visitorType} onChange={set("visitorType")}>{VISITOR_TYPES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label className="wide"><span>Nombre de quien viene</span><input value={draft.fullName} maxLength={160} onChange={set("fullName")} placeholder="Ej. Luis Ramírez" aria-invalid={Boolean(errors.fullName)}/>{errors.fullName ? <em className="portal-field-error">{errors.fullName}</em> : null}</label>
      <label><span>Desde</span><input type="datetime-local" value={draft.validFrom} onChange={set("validFrom")}/></label>
      <label><span>Hasta</span><input type="datetime-local" value={draft.validUntil} onChange={set("validUntil")} aria-invalid={Boolean(errors.validUntil)}/>{errors.validUntil ? <em className="portal-field-error">{errors.validUntil}</em> : null}</label>
      <label><span>Placas (opcional)</span><input value={draft.vehiclePlate} maxLength={15} onChange={set("vehiclePlate")} placeholder="ABC-123"/></label>
      <label><span>Entradas</span><input type="number" min="1" max="50" value={draft.maxEntries} onChange={set("maxEntries")} aria-invalid={Boolean(errors.maxEntries)}/>{errors.maxEntries ? <em className="portal-field-error">{errors.maxEntries}</em> : null}</label>
      {failure ? <p className="portal-tickets-note is-warn wide" role="alert">{failure}</p> : null}
      <footer><button type="submit" disabled={saving}><HiQrCode/> {saving ? "Creando pase…" : "Crear pase"}</button></footer>
    </form>}
  </section>;
}

export default PortalVisitors;
