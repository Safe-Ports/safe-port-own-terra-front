import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HiCheck, HiClock, HiXMark } from "react-icons/hi2";
import { useAppContext } from "@/context/AppContext";
import { contractService } from "@/services/contractService";
import { currency } from "@/services/formatters";
import InlineError from "@/components/shared/InlineError";
import { parseApiError } from "@/errors/parseApiError";
import "./pending.css";

/**
 * Bandeja de contratos esperando autorización.
 *
 * Sólo la ve un administrador: es quien puede resolverlos. Va arriba del
 * repositorio y no en una sección aparte a propósito — es trabajo pendiente
 * sobre los contratos, no otra cosa, y escondido en otra pantalla se olvidaría.
 *
 * Cuando no hay nada pendiente no se muestra nada: una tarjeta vacía diciendo
 * "no hay pendientes" es ruido en la pantalla que más se usa.
 */
export default function PendingApproval() {
  const qc = useQueryClient();
  const { currentUser, showToast } = useAppContext();
  const esAdmin = currentUser?.role === "admin";
  const [rechazando, setRechazando] = useState(null);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState(null);

  const { data } = useQuery({
    queryKey: ["contracts", "pending_approval"],
    queryFn: () => contractService.list({ status: "pending_approval", limit: 50 }),
    enabled: esAdmin,
  });
  const pendientes = data?.items || [];

  const refrescar = () => {
    // El contrato aprobado sale de la bandeja, entra al repositorio y genera
    // cobranza: las tres listas quedaron viejas.
    qc.invalidateQueries({ queryKey: ["contracts"] });
    qc.invalidateQueries({ queryKey: ["payments"] });
    qc.invalidateQueries({ queryKey: ["lots"] });
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  const aprobar = useMutation({
    mutationFn: (id) => contractService.approve(id),
    onSuccess: (c) => {
      refrescar();
      setError(null);
      showToast(`Contrato ${c.contract_number} aprobado`);
    },
    onError: (err) => setError(parseApiError(err, "No pudimos aprobar el contrato")),
  });

  const rechazar = useMutation({
    mutationFn: ({ id, reason }) => contractService.reject(id, reason),
    onSuccess: (c) => {
      refrescar();
      setRechazando(null);
      setMotivo("");
      setError(null);
      showToast(`Contrato ${c.contract_number} rechazado`);
    },
    onError: (err) => setError(parseApiError(err, "No pudimos rechazar el contrato")),
  });

  if (!esAdmin || pendientes.length === 0) return null;

  const trabajando = aprobar.isPending || rechazar.isPending;

  return (
    <div className="pa-card">
      <div className="pa-head">
        <span className="pa-ico"><HiClock aria-hidden="true" /></span>
        <div>
          <div className="pa-title">Contratos por aprobar</div>
          <div className="pa-sub">
            {pendientes.length === 1
              ? "Un contrato espera tu autorización."
              : `${pendientes.length} contratos esperan tu autorización.`}
            {" "}Hasta que lo apruebes, el lote queda apartado y no se genera cobranza.
          </div>
        </div>
        <span className="pa-count">{pendientes.length}</span>
      </div>

      {error && <div className="pa-err"><InlineError error={error} /></div>}

      <ul className="pa-list">
        {pendientes.map((c) => (
          <li key={c.id} className="pa-item">
            <div className="pa-item-id">
              <strong>{c.contract_number}</strong>
              <span>{c.client?.name || "—"} · {c.lot?.code || "—"} · {currency(c.amount)}</span>
              <small>Lo armó {c.seller?.name || "alguien del equipo"}</small>
            </div>

            {rechazando === c.id ? (
              <form
                className="pa-reject"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (motivo.trim()) rechazar.mutate({ id: c.id, reason: motivo.trim() });
                }}
              >
                <input
                  className="pa-input"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="¿Por qué lo rechazas? Lo verá quien lo armó"
                  maxLength={500}
                  autoFocus
                />
                <button type="submit" className="pa-btn pa-btn-no" disabled={!motivo.trim() || trabajando}>
                  {rechazar.isPending ? "Rechazando…" : "Rechazar"}
                </button>
                <button
                  type="button"
                  className="pa-btn pa-btn-ghost"
                  onClick={() => { setRechazando(null); setMotivo(""); setError(null); }}
                  disabled={trabajando}
                >
                  Cancelar
                </button>
              </form>
            ) : (
              <div className="pa-actions">
                <button
                  type="button"
                  className="pa-btn pa-btn-si"
                  onClick={() => aprobar.mutate(c.id)}
                  disabled={trabajando}
                >
                  <HiCheck aria-hidden="true" /> Aprobar
                </button>
                <button
                  type="button"
                  className="pa-btn pa-btn-ghost"
                  onClick={() => { setRechazando(c.id); setMotivo(""); setError(null); }}
                  disabled={trabajando}
                >
                  <HiXMark aria-hidden="true" /> Rechazar
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
