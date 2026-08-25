import { HiExclamationTriangle } from "react-icons/hi2";
import Modal from "@/components/ui/Modal";

/**
 * Confirmación con el estilo de la app, en lugar del window.confirm del navegador
 * (que rompe la identidad visual y no se puede matizar con un detalle o un aviso).
 *
 * Se controla desde fuera: el llamador guarda qué está confirmando y decide qué
 * hacer al aceptar.
 *
 * @param {boolean} open      Si el diálogo está visible.
 * @param {string}  title     Pregunta principal. Ej: "¿Eliminar usuario Ana?".
 * @param {node}    children  Detalle opcional: consecuencias, matices, avisos.
 * @param {string}  confirmLabel Texto del botón que confirma.
 * @param {boolean} danger    Pinta el botón de confirmar como destructivo.
 * @param {boolean} busy      Deshabilita los botones mientras corre la acción.
 * @param {func}    onConfirm Acción a ejecutar al aceptar.
 * @param {func}    onCancel  Cierra sin hacer nada (también con Esc o clic fuera).
 */
function ConfirmDialog({
  open,
  title,
  subtitle,
  icon = <HiExclamationTriangle />,
  children,
  confirmLabel = "Aceptar",
  cancelLabel = "Cancelar",
  danger = false,
  busy = false,
  confirmDisabled = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal
      open={open}
      title={title}
      subtitle={subtitle}
      icon={icon}
      width="max-w-[460px]"
      onClose={busy ? () => {} : onCancel}
      footer={
        <>
          <button className="btn-s" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button className={danger ? "btn-dan" : "btn-p"} onClick={onConfirm} disabled={busy || confirmDisabled}>
            {busy ? "Procesando..." : confirmLabel}
          </button>
        </>
      }
    >
      {children}
    </Modal>
  );
}

export default ConfirmDialog;
