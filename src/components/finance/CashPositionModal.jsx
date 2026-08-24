import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { HiOutlineXMark } from "react-icons/hi2";
import Button from "@/components/Button";
import useEscapeKey from "@/hooks/useEscapeKey";
import { useAppContext } from "@/context/AppContext";
import { financeService } from "@/services/financeService";
import { currency } from "@/services/formatters";

function CashPositionModal({ onClose, cashPosition }) {
  useEscapeKey(onClose);
  const qc = useQueryClient();
  const { showToast, showError, canUseFeature } = useAppContext();
  const canEdit = canUseFeature("finanzas.write");
  const [openingBalance, setOpeningBalance] = useState(String(cashPosition?.opening_balance ?? 0));
  const [openingDate, setOpeningDate] = useState(cashPosition?.opening_date || new Date().toISOString().split("T")[0]);

  const save = useMutation({
    mutationFn: () => financeService.updateCashPosition({ opening_balance: Number(openingBalance), opening_date: openingDate }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance-summary"] });
      showToast("Saldo de caja actualizado");
      onClose();
    },
    onError: (err) => showError(err, "Error al actualizar el saldo de caja"),
  });

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: 420 }}>
        <div className="modal-hd">
          <div className="modal-ico">🏦</div>
          <div style={{ flex: 1 }}>
            <div className="modal-title" style={{ fontSize: "1.3rem" }}>Saldo de Caja</div>
            <div className="modal-sub">Balance real, arrastrado desde una fecha de inicio.</div>
          </div>
          <button className="modal-close" onClick={onClose}><HiOutlineXMark /></button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: ".84rem", color: "var(--mu)", margin: "0 0 4px" }}>
            Saldo actual: <strong style={{ color: "var(--tx)" }}>{cashPosition ? currency(cashPosition.balance) : "—"}</strong>
          </p>
          {canEdit ? (
            <>
              <div className="fg">
                <label className="fl">Saldo inicial</label>
                <input className="fi" type="number" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} placeholder="0" />
              </div>
              <div className="fg">
                <label className="fl">Fecha del saldo inicial</label>
                <input className="fi" type="date" value={openingDate} onChange={(e) => setOpeningDate(e.target.value)} />
              </div>
              <p style={{ fontSize: ".78rem", color: "var(--mu)", margin: 0 }}>
                Si tu organización ya tenía dinero en caja antes de usar OwnTerra, corrígelo aquí — por defecto arranca en $0
                desde la fecha en que se creó la cuenta.
              </p>
            </>
          ) : (
            <p style={{ fontSize: ".84rem", color: "var(--mu)" }}>No tienes permiso para editar el saldo inicial.</p>
          )}
        </div>
        <div className="modal-foot">
          <Button variant="secondary" style={{ flex: 1 }} onClick={onClose}>Cerrar</Button>
          {canEdit && (
            <Button variant="primary" style={{ flex: 2 }} onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? "Guardando..." : "Guardar"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default CashPositionModal;
