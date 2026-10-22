import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/Button";
import { CSI_DIVISIONS } from "../data/mockCatalog";

const KIND_LABEL = { MAT: "Material", MO: "Mano de obra", EQ: "Equipo/Maquinaria" };
const EMPTY = { kind: "MAT", code: "", name: "", csiDivision: "03", unit: "", baseCost: 0, usefulLifeHours: 1 };

/* Alta/edición de un insumo del Catálogo Maestro (Módulo 1 del PRD): MAT, MO
   (con Salario Base) o EQ (con vida útil en horas para el costo horario). */
function CatalogItemForm({ open, onClose, onSubmit, initial }) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (open) setForm(initial ? { ...EMPTY, ...initial } : EMPTY);
  }, [open, initial]);

  const submit = () => onSubmit(form);

  return (
    <Modal open={open} title={initial ? "Editar insumo" : "Nuevo insumo"} subtitle="Materiales, mano de obra y equipo — la única fuente de verdad de costos." onClose={onClose}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button disabled={!form.code || !form.name} onClick={submit}>Guardar</Button>
        </>
      )}>
      <div className="obr-form-grid">
        <label className="obr-field">
          <span>Tipo</span>
          <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
            {Object.entries(KIND_LABEL).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
          </select>
        </label>
        <label className="obr-field">
          <span>División CSI</span>
          <select value={form.csiDivision} onChange={(e) => setForm({ ...form, csiDivision: e.target.value })}>
            {CSI_DIVISIONS.map((d) => <option key={d.code} value={d.code}>{d.code} · {d.name}</option>)}
          </select>
        </label>
        <label className="obr-field">
          <span>Clave</span>
          <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="MAT-001" />
        </label>
        <label className="obr-field">
          <span>Unidad</span>
          <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="saco / kg / jornal / hora" />
        </label>
        <label className="obr-field full">
          <span>Descripción</span>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Cemento gris (saco 50kg)" />
        </label>
        <label className="obr-field">
          <span>{form.kind === "MO" ? "Salario base" : "Costo base"}</span>
          <input type="number" value={form.baseCost} onChange={(e) => setForm({ ...form, baseCost: Number(e.target.value) || 0 })} />
        </label>
        {form.kind === "EQ" && (
          <label className="obr-field">
            <span>Vida útil (horas)</span>
            <input type="number" value={form.usefulLifeHours} onChange={(e) => setForm({ ...form, usefulLifeHours: Number(e.target.value) || 1 })} />
          </label>
        )}
      </div>
    </Modal>
  );
}

export default CatalogItemForm;
