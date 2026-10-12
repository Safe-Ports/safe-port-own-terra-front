import { useEffect, useState } from "react";

// Solo guarda identificadores de evidencia pendiente, nunca archivos o contactos.
// El destino permanece aislado por usuario y organización aun al volver a la vista.
const KEY = "ot_pending_receipts";
export default function usePendingReceipts(user) {
  const owner = `${user?.organization?.id || ""}:${user?.id || ""}`;
  const [entries, setEntries] = useState(() => {
    try { const stored = JSON.parse(sessionStorage.getItem(KEY) || "[]"); return Array.isArray(stored) ? stored : []; }
    catch { return []; }
  });
  useEffect(() => { try { sessionStorage.setItem(KEY, JSON.stringify(entries)); } catch { /* El aviso sigue disponible durante esta visita. */ } }, [entries]);
  return {
    issues: entries.filter(entry => entry.owner === owner),
    add: issue => { if (issue) setEntries(previous => [...previous.filter(entry => !(entry.owner === owner && entry.kind === issue.kind && entry.id === issue.id)), { ...issue, owner }]); },
    remove: issue => setEntries(previous => previous.filter(entry => !(entry.owner === owner && entry.kind === issue.kind && entry.id === issue.id))),
  };
}
