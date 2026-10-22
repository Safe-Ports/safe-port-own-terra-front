import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { contractService } from "@/services/contractService";
import useDebouncedValue from "@/hooks/useDebouncedValue";
import InlineError from "@/components/shared/InlineError";
import { parseApiError } from "@/errors/parseApiError";

export default function ContractPicker({ value, onSelect, disabled = false }) {
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search.trim());
  const detail = useQuery({ queryKey: ["contracts", "picker-detail", value], queryFn: () => contractService.get(value), enabled: !!value });
  const lookup = useQuery({ queryKey: ["contracts", "picker-search", debounced], queryFn: () => contractService.list({ search: debounced, limit: 8 }), enabled: !!debounced && !value && !disabled });
  if (value) return <div className="selected-summary"><div><strong>{detail.data?.contract_number || "Contrato seleccionado"}</strong><div className="client-meta">{detail.data?.client?.name}</div>{detail.isError && <InlineError error={parseApiError(detail.error)}><button type="button" onClick={() => detail.refetch()}>Reintentar</button></InlineError>}</div><button type="button" className="swap" disabled={disabled} onClick={() => onSelect(null)}>Cambiar contrato</button></div>;
  return <div className="client-field"><input className="fi" aria-label="Buscar contrato por número" placeholder="Escribe el número de contrato" value={search} disabled={disabled} onChange={event => setSearch(event.target.value)} />{search.trim() && <div className="client-results">{search.trim() !== debounced || lookup.isFetching ? <p className="client-row-empty">Buscando contratos…</p> : lookup.isError ? <InlineError error={parseApiError(lookup.error)}><button type="button" onClick={() => lookup.refetch()}>Reintentar</button></InlineError> : (lookup.data?.items || []).length ? lookup.data.items.map(contract => <button type="button" className="client-row" key={contract.id} onClick={() => { onSelect(contract.id); setSearch(""); }}><div><strong>{contract.contract_number}</strong><div className="client-meta">{contract.client?.name} · {contract.lot?.code}</div></div></button>) : <p className="client-row-empty">Sin contratos que coincidan.</p>}</div>}</div>;
}
