import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { HiMagnifyingGlass, HiPlusCircle } from "react-icons/hi2";
import { clientService } from "@/services/clientService";
import PhoneInput from "@/components/shared/PhoneInput";

function initials(name) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

/**
 * Buscar un cliente del CRM o crear uno nuevo sin salir del flujo actual.
 *
 * El buscador va primero (server-side, por nombre/correo/teléfono) porque la
 * mayoría de las veces el cliente ya existe — un botón de "crear" como única
 * opción generaría duplicados. El alta inline solo aparece cuando la búsqueda
 * no encuentra nada.
 *
 * `value`/`onSelect` llevan el CLIENTE completo ({id, name, phone, email}), no
 * solo el id: quien lo usa (p. ej. "Apartar lote") necesita mostrar el nombre
 * sin tener que ir a buscarlo de nuevo.
 */
export default function ClientPicker({ value, onSelect, disabled }) {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newClient, setNewClient] = useState({ name: "", phone: "", email: "" });
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setSearching(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const { items } = await clientService.list({ search: query.trim(), limit: 8 });
        setResults(items || []);
      } catch (_) {
        setResults([]);
      } finally {
        setSearching(false);
        setSearched(true);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const startCreate = () => {
    setNewClient({ name: query.trim(), phone: "", email: "" });
    setCreating(true);
  };

  const createClient = async () => {
    const name = newClient.name.trim();
    if (!name || saving) return;
    setSaving(true);
    try {
      const created = await clientService.create({
        name,
        phone: newClient.phone?.trim() || null,
        email: newClient.email?.trim() || null,
        type: "lead",
      });
      try {
        await clientService.assignApp(created.id, "lands");
      } catch (_) {
        // No crítico para poder apartar el lote con este cliente.
      }
      await queryClient.invalidateQueries({ queryKey: ["clients"] });
      setCreating(false);
      setQuery("");
      onSelect(created);
    } finally {
      setSaving(false);
    }
  };

  if (value) {
    return (
      <div className="client-field">
        <div className="selected-summary">
          <div className="client-av">{initials(value.name)}</div>
          <div>
            <div className="client-name">{value.name}</div>
            {value.phone ? <div className="client-meta">{value.phone}</div> : null}
          </div>
          {!disabled && (
            <button type="button" className="swap" onClick={() => onSelect(null)}>Cambiar</button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="client-field">
      <div className="client-search-wrap">
        <HiMagnifyingGlass className="search-ico" />
        <input
          className="client-search"
          placeholder="Buscar cliente por nombre, correo o teléfono…"
          value={query}
          disabled={disabled || creating}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {query.trim() && !creating ? (
        <div className="client-results">
          {searching ? (
            <div className="client-row-empty">Buscando…</div>
          ) : results.length > 0 ? (
            results.map((c) => (
              <div key={c.id} className="client-row" onClick={() => { onSelect(c); setQuery(""); }}>
                <div className="client-av">{initials(c.name)}</div>
                <div>
                  <div className="client-name">{c.name}</div>
                  <div className="client-meta">{c.phone || c.email || ""}</div>
                </div>
              </div>
            ))
          ) : searched ? (
            <div className="client-row-empty">Sin coincidencias</div>
          ) : null}
        </div>
      ) : null}

      {!creating && searched && !searching && (
        <button type="button" className="new-client-toggle" onClick={startCreate}>
          <span className="plus"><HiPlusCircle /></span>
          {results.length === 0 ? "Ninguno es · crear cliente nuevo" : "Crear cliente nuevo"}
        </button>
      )}

      {creating && (
        <div className="inline-create">
          <input
            className="mini-input full"
            placeholder="Nombre del cliente"
            value={newClient.name}
            onChange={(e) => setNewClient((p) => ({ ...p, name: e.target.value }))}
            autoFocus
          />
          <PhoneInput
            inputClassName="mini-input"
            value={newClient.phone}
            onChange={(v) => setNewClient((p) => ({ ...p, phone: v }))}
          />
          <input
            className="mini-input"
            placeholder="Correo (opcional)"
            value={newClient.email}
            onChange={(e) => setNewClient((p) => ({ ...p, email: e.target.value }))}
          />
          <button
            type="button"
            className="mini-save"
            disabled={!newClient.name.trim() || saving}
            onClick={createClient}
          >
            {saving ? "Creando…" : "+ Crear y usar este cliente"}
          </button>
          <button type="button" className="mini-cancel" onClick={() => setCreating(false)}>
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}
