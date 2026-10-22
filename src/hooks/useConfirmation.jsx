import { useEffect, useRef, useState } from "react";
import ConfirmDialog from "@/components/shared/ConfirmDialog";

export default function useConfirmation() {
  const [message, setMessage] = useState(null);
  const resolver = useRef(null);
  const confirm = text => new Promise(resolve => {
    resolver.current?.(false);
    resolver.current = resolve;
    setMessage(text);
  });
  const finish = result => { resolver.current?.(result); resolver.current = null; setMessage(null); };
  useEffect(() => () => { resolver.current?.(false); }, []);
  return { requestConfirmation: confirm, confirmationDialog: <ConfirmDialog open={message !== null} title="Confirmar acción" confirmLabel="Confirmar" onCancel={() => finish(false)} onConfirm={() => finish(true)}>{message}</ConfirmDialog> };
}
