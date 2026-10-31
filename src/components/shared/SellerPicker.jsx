import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HiMagnifyingGlass, HiPlusCircle } from "react-icons/hi2";
import { orgService } from "@/services/orgService";
import { useAppContext } from "@/context/AppContext";
import QuickSellerForm from "./QuickSellerForm";

function initials(name) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

const normalize = (text) => String(text || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export function matchSellers(users, query) {
  const q = normalize(query);
  if (!q) return [];
  return users.filter((u) => normalize(u.name).includes(q) || normalize(u.email).includes(q)).slice(0, 8);
}

/**
 * Buscar al vendedor en el equipo o registrarlo sin salir del formulario, igual
 * que ClientPicker con los clientes: el buscador va primero porque casi siempre
 * el vendedor ya existe, y el alta solo se ofrece a quien administra el equipo.
 *
 * `value` es el id del vendedor; `onChange` recibe (id, vendedor) para que quien
 * lo usa pueda mostrar el nombre sin volver a buscarlo.
 */
export default function SellerPicker({ value, onChange, disabled, inputId, emptyHint }) {
  const queryClient = useQueryClient();
  const { canUseFeature, showToast } = useAppContext();
  const canCreate = canUseFeature?.("core.team");
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [formKey, setFormKey] = useState(0);

  // Solo vendedores ACTIVOS: no se ofrece como responsable a alguien dado de baja.
  const usersQuery = useQuery({
    queryKey: ["users-list", "active"],
    queryFn: () => orgService.listUsers({ limit: 100, is_active: true }),
    staleTime: 120_000,
  });
  const users = usersQuery.data?.items || (Array.isArray(usersQuery.data) ? usersQuery.data : []);
  const selected = value ? users.find((u) => String(u.id) === String(value)) : null;
  const results = matchSellers(users, query);

  const startCreate = () => {
    setFormKey((k) => k + 1);
    setCreating(true);
  };
  const pick = (seller) => {
    onChange(seller ? String(seller.id) : "", seller || null);
    setQuery("");
    setCreating(false);
  };

  if (value) {
    const name = selected?.name || (usersQuery.isLoading ? "Cargando…" : "Vendedor asignado");
    return (
      <div className="client-field">
        <div className="selected-summary">
          <div className="client-av">{initials(selected?.name)}</div>
          <div>
            {inputId ? <input id={inputId} className="fi" value={name} readOnly aria-label="Vendedor seleccionado" /> : <div className="client-name">{name}</div>}
            {selected?.email ? <div className="client-meta">{selected.email}</div> : null}
          </div>
          {!disabled && (
            <button type="button" className="swap" onClick={() => pick(null)}>Cambiar</button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="client-field">
      {!creating && (
        <div className="client-search-row">
          <div className="client-search-wrap">
            <HiMagnifyingGlass className="search-ico" />
            <input
              id={inputId}
              aria-label="Buscar vendedor por nombre o correo"
              autoComplete="off"
              className="client-search"
              placeholder="Buscar vendedor por nombre o correo…"
              value={query}
              disabled={disabled}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {canCreate && (
            <button type="button" className="client-new-btn" onClick={startCreate} disabled={disabled} title="Registrar un vendedor nuevo">
              <HiPlusCircle /> Nuevo
            </button>
          )}
        </div>
      )}

      {!creating && !query.trim() && emptyHint ? <div className="client-meta">{emptyHint}</div> : null}

      {query.trim() && !creating ? (
        <div className="client-results">
          {usersQuery.isLoading ? (
            <div className="client-row-empty">Buscando…</div>
          ) : usersQuery.isError ? (
            <div role="alert" className="client-row-empty">No se pudo cargar el equipo. <button type="button" onClick={() => usersQuery.refetch()}>Reintentar</button></div>
          ) : results.length > 0 ? (
            results.map((u) => (
              <button type="button" key={u.id} className="client-row" onClick={() => pick(u)}>
                <div className="client-av">{initials(u.name)}</div>
                <div>
                  <div className="client-name">{u.name}</div>
                  <div className="client-meta">{u.email || ""}</div>
                </div>
              </button>
            ))
          ) : canCreate ? (
            <button type="button" className="client-row-empty as-cta" onClick={startCreate}>
              Sin coincidencias · <b>registrar «{query.trim()}»</b>
            </button>
          ) : (
            <div className="client-row-empty">Nadie del equipo coincide. Pide a un administrador que lo registre en Equipo.</div>
          )}
        </div>
      ) : null}

      {creating && (
        <QuickSellerForm
          key={formKey}
          initialName={query.trim()}
          existingUsers={users}
          onUseExisting={pick}
          onCancel={() => setCreating(false)}
          onCreated={async (seller) => {
            await queryClient.invalidateQueries({ queryKey: ["users-list"] });
            await queryClient.invalidateQueries({ queryKey: ["users"] });
            pick(seller);
            showToast?.(`${seller.name} quedó registrado como vendedor`);
          }}
        />
      )}
    </div>
  );
}
