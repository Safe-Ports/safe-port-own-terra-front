import { useEffect, useRef, useState } from "react";
import ConfirmDialog from "@/components/shared/ConfirmDialog";

/**
 * `requestConfirmation(texto, opciones?)` abre el diálogo y resuelve true/false.
 * Las opciones (title, confirmLabel, cancelLabel, danger, icon) permiten que el botón
 * diga lo que hace ("Salir sin guardar") en vez del genérico "Confirmar".
 */
export default function useConfirmation() {
  const [request, setRequest] = useState(null);
  const resolver = useRef(null);
  const confirm = (text, options = {}) => new Promise(resolve => {
    resolver.current?.(false);
    resolver.current = resolve;
    setRequest({ text, options });
  });
  const finish = result => { resolver.current?.(result); resolver.current = null; setRequest(null); };
  useEffect(() => () => { resolver.current?.(false); }, []);
  const options = request?.options || {};
  return {
    requestConfirmation: confirm,
    confirmationDialog: (
      <ConfirmDialog
        open={request !== null}
        title={options.title || "Confirmar acción"}
        confirmLabel={options.confirmLabel || "Confirmar"}
        cancelLabel={options.cancelLabel || "Cancelar"}
        danger={Boolean(options.danger)}
        icon={options.icon}
        onCancel={() => finish(false)}
        onConfirm={() => finish(true)}
      >
        {request?.text}
      </ConfirmDialog>
    ),
  };
}
