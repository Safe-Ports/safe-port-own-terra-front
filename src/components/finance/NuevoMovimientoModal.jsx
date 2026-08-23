import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HiOutlineXMark } from "react-icons/hi2";
import Button from "@/components/Button";
import FieldError from "@/components/shared/FieldError";
import { useFieldErrors } from "@/hooks/useFieldErrors";
import useEscapeKey from "@/hooks/useEscapeKey";
import { useAppContext } from "@/context/AppContext";
import { expenseService, CAT_LABEL } from "@/services/expenseService";
import { employeeService } from "@/services/employeeService";
import { providerService } from "@/services/providerService";

const reqText = (label) => (v) => (!v || !String(v).trim() ? `${label} es obligatorio.` : "");
const reqNum = (label) => (v) => (v === "" || v == null || isNaN(Number(v)) || Number(v) <= 0 ? `Ingresa un ${label} válido (> 0).` : "");
const RULES = { concepto: reqText("El concepto"), monto: reqNum("monto") };

/* "+ Nuevo Movimiento" de la topbar de Finanzas. Los ingresos nacen de un
   contrato/pago real en Lands (no se dan de alta sueltos acá) — este modal
   solo registra egresos, con el mismo selector de colaborador/proveedor que
   ya existe en el formulario de egresos de Lands. */
function NuevoMovimientoModal({ onClose, initialCategoria = "servicios", initialEmployeeId = "" }) {
  useEscapeKey(onClose);
  const qc = useQueryClient();
  const { showToast, showError } = useAppContext();
  const fe = useFieldErrors();
  const [form, setForm] = useState({
    concepto: "", categoria: initialCategoria, monto: "",
    due_date: new Date().toISOString().split("T")[0],
    employee_id: initialEmployeeId, provider_id: "",
  });
  const set = (k) => (e) => { const v = e.target.value; setForm((p) => ({ ...p, [k]: v })); fe.clear(k); };

  const { data: employees } = useQuery({
    queryKey: ["employees", "nuevo-movimiento"],
    queryFn: () => employeeService.list({ limit: 100 }).then((r) => r.items),
    enabled: form.categoria === "nomina",
  });
  const { data: providers } = useQuery({
    queryKey: ["providers", "nuevo-movimiento"],
    queryFn: () => providerService.list({ limit: 100 }).then((r) => r.items),
    enabled: form.categoria === "proveedores",
  });

  const createMutation = useMutation({
    mutationFn: (body) => expenseService.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance-summary"] });
      qc.invalidateQueries({ queryKey: ["finance-transactions"] });
      showToast("Movimiento registrado");
      onClose();
    },
    onError: (err) => showError(err, "Error al registrar el movimiento"),
  });

  const save = () => {
    if (!fe.validate(form, RULES)) return;
    createMutation.mutate({
      concepto: form.concepto,
      categoria: form.categoria,
      monto: Number(form.monto),
      due_date: form.due_date,
      employee_id: form.categoria === "nomina" ? (form.employee_id || null) : null,
      provider_id: form.categoria === "proveedores" ? (form.provider_id || null) : null,
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: 440 }}>
        <div className="modal-hd">
          <div className="modal-ico">💸</div>
          <div style={{ flex: 1 }}>
            <div className="modal-title" style={{ fontSize: "1.3rem" }}>Nuevo movimiento</div>
            <div className="modal-sub">Egreso — nómina, servicios, impuestos, proveedores...</div>
          </div>
          <button className="modal-close" onClick={onClose}><HiOutlineXMark /></button>
        </div>
        <div className="modal-body">
          <div className="fg"><label className="fl">Concepto</label>
            <input {...fe.fieldProps("concepto")} value={form.concepto} onChange={set("concepto")} placeholder="Nómina junio, CFE…" />
            <FieldError msg={fe.errors.concepto} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="fg"><label className="fl">Categoría</label>
              <select className="fi" value={form.categoria} onChange={set("categoria")}>
                {Object.entries(CAT_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select></div>
            <div className="fg"><label className="fl">Monto</label>
              <input {...fe.fieldProps("monto")} type="number" value={form.monto} onChange={set("monto")} placeholder="0" />
              <FieldError msg={fe.errors.monto} /></div>
          </div>
          {form.categoria === "nomina" && (
            <div className="fg"><label className="fl">Colaborador (opcional)</label>
              <select className="fi" value={form.employee_id} onChange={set("employee_id")}>
                <option value="">Sin asignar</option>
                {(employees || []).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select></div>
          )}
          {form.categoria === "proveedores" && (
            <div className="fg"><label className="fl">Proveedor (opcional)</label>
              <select className="fi" value={form.provider_id} onChange={set("provider_id")}>
                <option value="">Sin asignar</option>
                {(providers || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select></div>
          )}
          <div className="fg"><label className="fl">Fecha límite</label>
            <input className="fi" type="date" value={form.due_date} onChange={set("due_date")} /></div>
        </div>
        <div className="modal-foot">
          <Button variant="secondary" style={{ flex: 1 }} onClick={onClose}>Cancelar</Button>
          <Button variant="primary" style={{ flex: 2 }} onClick={save} disabled={createMutation.isPending}>
            {createMutation.isPending ? "Guardando..." : "Guardar movimiento"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default NuevoMovimientoModal;
