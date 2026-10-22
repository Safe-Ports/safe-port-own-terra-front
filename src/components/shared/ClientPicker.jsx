import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HiMagnifyingGlass, HiPlusCircle } from "react-icons/hi2";
import { clientService } from "@/services/clientService";
import { useAppContext } from "@/context/AppContext";
import useDebouncedValue from "@/hooks/useDebouncedValue";
import ClientForm, { CLIENT_FIELD_MAP, useClientForm } from "@/components/shared/ClientForm";

function initials(name) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

/**
 * Alta rápida con el MISMO formulario de la sección Clientes: mismos campos,
 * mismas validaciones y misma detección de correo duplicado. Va en su propio
 * componente porque `useClientForm` es un hook y necesita montarse recién
 * cuando el usuario decide crear.
 */
function NewClientForm({ initialName, clients, saving, onCreate, onCancel }) {
  // Lo que ya venía escrito en el buscador se aprovecha como nombre. Sin `id`,
  // así que sigue tratándose como alta nueva (y detecta correos duplicados).
  const ctl = useClientForm(
    initialName ? { name: initialName, type: "lead" } : null,
    clients
  );

  return (
    <div className="cp-create">
      <ClientForm ctl={ctl} compact showNotice={false} />
      <div className="cp-create-actions">
        <button type="button" className="mini-save" disabled={saving} onClick={() => onCreate(ctl)}>
          {saving ? "Guardando…" : ctl.dupe ? "Vincular y usar este cliente" : "Crear y usar este cliente"}
        </button>
        <button type="button" className="mini-cancel" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
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
export default function ClientPicker({ value, onSelect, disabled, allowCreate = true, inputId }) {
  const queryClient = useQueryClient();
  const { clients = [], showError } = useAppContext();
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const debounced = useDebouncedValue(query.trim());
  const lookup = useQuery({
    queryKey: ["clients", "lookup", debounced],
    queryFn: () => clientService.list({ search: debounced, limit: 8 }),
    enabled: !!debounced && !value && !creating && !disabled,
    staleTime: 30_000,
  });
  const results = lookup.data?.items || [];
  const searching = query.trim() !== debounced || lookup.isFetching;
  const searched = lookup.isSuccess;

  const startCreate = () => {
    setFormKey((k) => k + 1);
    setCreating(true);
  };

  if (value) {
    return (
      <div className="client-field">
        <div className="selected-summary">
          <div className="client-av">{initials(value.name)}</div>
          <div>
            {inputId ? <input id={inputId} className="fi" value={value.name} readOnly aria-label="Cliente seleccionado" /> : <div className="client-name">{value.name}</div>}
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
      {/* Buscar y dar de alta son dos caminos igual de válidos: el botón está
          siempre a la vista para no obligar a buscar a quien ya sabe que el
          cliente no existe. */}
      {!creating && (
        <div className="client-search-row">
          <div className="client-search-wrap">
            <HiMagnifyingGlass className="search-ico" />
            <input
              id={inputId}
              aria-label="Buscar cliente por nombre, correo o teléfono"
              autoComplete="off"
              className="client-search"
              placeholder="Buscar cliente por nombre, correo o teléfono…"
              value={query}
              disabled={disabled}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {allowCreate && <button
            type="button"
            className="client-new-btn"
            onClick={startCreate}
            disabled={disabled}
            title="Registrar un cliente nuevo"
          >
            <HiPlusCircle /> Nuevo
          </button>}
        </div>
      )}

      {query.trim() && !creating ? (
        <div className="client-results">
          {searching ? (
            <div className="client-row-empty">Buscando…</div>
          ) : lookup.isError ? (
            <div role="alert" className="client-row-empty">No se pudo buscar clientes. <button type="button" onClick={() => lookup.refetch()}>Reintentar</button></div>
          ) : results.length > 0 ? (
            results.map((c) => (
              <button type="button" key={c.id} className="client-row" onClick={() => { queryClient.setQueryData(["client", String(c.id)], c); onSelect(c); setQuery(""); }}>
                <div className="client-av">{initials(c.name)}</div>
                <div>
                  <div className="client-name">{c.name}</div>
                  <div className="client-meta">{c.phone || c.email || ""}</div>
                </div>
              </button>
            ))
          ) : searched && allowCreate ? (
            <button type="button" className="client-row-empty as-cta" onClick={startCreate}>
              Sin coincidencias · <b>registrar «{query.trim()}»</b>
            </button>
          ) : searched ? <div className="client-row-empty">Sin clientes que coincidan.</div> : null}
        </div>
      ) : null}

      {creating && (
        <NewClientForm
          key={formKey}
          initialName={query.trim()}
          clients={clients}
          saving={saving}
          onCancel={() => setCreating(false)}
          onCreate={async (ctl) => {
            if (!ctl.validate() || saving) return;
            setSaving(true);
            try {
              const data = ctl.payload();
              // Mismo correo ya registrado: se usa esa identidad en vez de duplicarla.
              if (data.linkClientId) {
                const existing = clients.find((c) => c.id === data.linkClientId);
                await clientService.assignApp(data.linkClientId, "lands").catch(() => {});
                await queryClient.invalidateQueries({ queryKey: ["clients"] });
                setCreating(false);
                setQuery("");
                onSelect(existing);
                return;
              }
              const created = await clientService.create({
                name: data.name,
                phone: data.phone?.trim() || null,
                email: data.email?.trim() || null,
                type: data.type || "lead",
                notes: data.notes?.trim() || null,
              });
              // Vincular a Lands no es crítico para poder seguir con el lote.
              await clientService.assignApp(created.id, "lands").catch(() => {});
              await queryClient.invalidateQueries({ queryKey: ["clients"] });
              setCreating(false);
              setQuery("");
              queryClient.setQueryData(["client", String(created.id)], created);
              onSelect(created);
            } catch (err) {
              if (!ctl.fe.fromServer(err, CLIENT_FIELD_MAP)) {
                showError(err, "No se pudo crear el cliente");
              }
            } finally {
              setSaving(false);
            }
          }}
        />
      )}
    </div>
  );
}
