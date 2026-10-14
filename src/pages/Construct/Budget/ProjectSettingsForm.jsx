import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as constructService from "@/services/constructService";
import { useAppContext } from "@/context/AppContext";

const FIELDS = [
  { key: "indirectosCampo", label: "Indirectos de campo", suffix: "%" },
  { key: "indirectosOficina", label: "Indirectos de oficina", suffix: "%" },
  { key: "financiamiento", label: "Financiamiento", suffix: "%" },
  { key: "utilidad", label: "Utilidad", suffix: "%" },
];

/* Parámetros Financieros Globales del proyecto (Módulo 2 del PRD) — a
   diferencia del demo, estos porcentajes alimentan de verdad la cascada del
   Core Engine (utils/costEngine.js), no están incrustados como texto fijo. */
function ProjectSettingsForm({ project }) {
  const { canUseFeature, showToast } = useAppContext();
  const canEdit = canUseFeature("construct.budget");
  const queryClient = useQueryClient();

  const toPercentForm = (settings) => ({
    indirectosCampo: (settings.indirectosCampo * 100).toString(),
    indirectosOficina: (settings.indirectosOficina * 100).toString(),
    financiamiento: (settings.financiamiento * 100).toString(),
    utilidad: (settings.utilidad * 100).toString(),
    cargosAdicionales: settings.cargosAdicionales.toString(),
  });

  const [form, setForm] = useState(() => toPercentForm(project.settings));
  useEffect(() => { setForm(toPercentForm(project.settings)); }, [project.id]);

  const saveMutation = useMutation({
    mutationFn: () => constructService.updateProjectSettings(project.id, {
      indirectosCampo: (Number(form.indirectosCampo) || 0) / 100,
      indirectosOficina: (Number(form.indirectosOficina) || 0) / 100,
      financiamiento: (Number(form.financiamiento) || 0) / 100,
      utilidad: (Number(form.utilidad) || 0) / 100,
      cargosAdicionales: Number(form.cargosAdicionales) || 0,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["construct-project", project.id] });
      showToast("Parámetros financieros actualizados");
    },
  });

  return (
    <div className="obr-card obr-settings-card">
      <div className="obr-card-head">
        <div><h2>Parámetros financieros globales</h2><p>Alimentan el Pie de Precios de todos los conceptos APU del proyecto.</p></div>
      </div>
      <div className="obr-form-grid">
        {FIELDS.map(({ key, label, suffix }) => (
          <label className="obr-field" key={key}>
            <span>{label}</span>
            <div className="obr-suffix-input">
              <input type="number" step="0.1" disabled={!canEdit} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
              <span>{suffix}</span>
            </div>
          </label>
        ))}
        <label className="obr-field">
          <span>Cargos adicionales</span>
          <div className="obr-suffix-input">
            <span>$</span>
            <input type="number" disabled={!canEdit} value={form.cargosAdicionales} onChange={(e) => setForm({ ...form, cargosAdicionales: e.target.value })} />
          </div>
        </label>
      </div>
      {canEdit && <button type="button" className="obr-primary" onClick={() => saveMutation.mutate()}>Guardar parámetros</button>}
      {!canEdit && <p className="obr-muted">Tu rol no tiene permiso para editar los parámetros financieros del proyecto.</p>}
    </div>
  );
}

export default ProjectSettingsForm;
