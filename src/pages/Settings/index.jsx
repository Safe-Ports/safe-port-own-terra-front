import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppContext } from "@/context/AppContext";
import { orgService } from "@/services/orgService";
import Button from "@/components/Button";

function SettingsPage() {
  const { currentUser, showToast } = useAppContext();
  const queryClient = useQueryClient();
  const isAdmin = currentUser?.role === "admin";

  const { data: org, isLoading: orgLoading } = useQuery({
    queryKey: ["organization"],
    queryFn: orgService.get,
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => orgService.listUsers({ limit: 50 }),
  });

  const users = usersData?.items || [];

  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "vendor" });
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      showToast("Nombre, correo y contraseña son obligatorios");
      return;
    }
    setCreating(true);
    try {
      await orgService.createUser(newUser);
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      setNewUser({ name: "", email: "", password: "", role: "vendor" });
      setShowForm(false);
      showToast("Usuario creado");
    } catch (err) {
      const detail = err?.response?.data?.detail;
      showToast(typeof detail === "string" ? detail : "Error al crear usuario");
    } finally {
      setCreating(false);
    }
  };

  const handleResetPassword = async (id, name) => {
    try {
      await orgService.resetPassword(id);
      showToast(`Contraseña restablecida para ${name}`);
    } catch {
      showToast("Error al restablecer contraseña");
    }
  };

  const handleDeleteUser = async (id, name) => {
    if (!window.confirm(`¿Eliminar usuario ${name}?`)) return;
    try {
      await orgService.deleteUser(id);
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      showToast("Usuario eliminado");
    } catch {
      showToast("Error al eliminar usuario");
    }
  };

  return (
    <div className="space-y-4">
      {/* Organización */}
      <div className="card">
        <div className="card-hd">
          <div className="card-title">🏢 Organización</div>
        </div>
        <div className="card-body">
          {orgLoading ? (
            <div className="text-sm text-[#83867C]">Cargando...</div>
          ) : org ? (
            <div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4" style={{ marginBottom: 16 }}>
                {[
                  ["Usuarios", org.stats.total_users],
                  ["Lotes", org.stats.total_lots],
                  ["Clientes", org.stats.total_clients],
                  ["Contratos", org.stats.total_contracts],
                ].map(([label, value]) => (
                  <div key={label} className="price-c">
                    <div className="pc-l">{label}</div>
                    <div className="pc-v">{value}</div>
                  </div>
                ))}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  ["Nombre", org.name],
                  ["Plan", org.plan],
                  ["Estado suscripción", org.subscription_status],
                  ["Correo", org.email || "—"],
                  ["Teléfono", org.phone || "—"],
                  ["RFC / Tax ID", org.tax_id || "—"],
                  ["Dirección", org.address || "—"],
                ].map(([label, value]) => (
                  <div key={label} className="d-row">
                    <span className="d-lbl">{label}</span>
                    <span className="d-val">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-sm text-[#83867C]">Sin datos</div>
          )}
        </div>
      </div>

      {/* Usuarios */}
      <div className="card">
        <div className="card-hd">
          <div className="card-title">👥 Usuarios del equipo</div>
          {isAdmin && (
            <button className="btn-p" onClick={() => setShowForm((v) => !v)}>
              {showForm ? "Cancelar" : "+ Nuevo usuario"}
            </button>
          )}
        </div>
        <div className="card-body">
          {showForm && isAdmin && (
            <div className="fr-row" style={{ flexWrap: "wrap", gap: 10, marginBottom: 16, padding: "14px", background: "var(--sf2)", borderRadius: 10, border: "1px solid var(--bd)" }}>
              <div className="fg" style={{ flex: 1, minWidth: 160 }}>
                <label className="fl">Nombre</label>
                <input className="fi" value={newUser.name} onChange={(e) => setNewUser((p) => ({ ...p, name: e.target.value }))} placeholder="Juan García" />
              </div>
              <div className="fg" style={{ flex: 1, minWidth: 160 }}>
                <label className="fl">Correo</label>
                <input className="fi" type="email" value={newUser.email} onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))} placeholder="juan@empresa.com" />
              </div>
              <div className="fg" style={{ flex: 1, minWidth: 140 }}>
                <label className="fl">Contraseña temporal</label>
                <input className="fi" type="password" value={newUser.password} onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))} />
              </div>
              <div className="fg" style={{ minWidth: 120 }}>
                <label className="fl">Rol</label>
                <select className="fi" value={newUser.role} onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value }))}>
                  <option value="vendor">Vendedor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <button className="btn-p" onClick={handleCreateUser} disabled={creating}>
                  {creating ? "Creando..." : "✓ Crear"}
                </button>
              </div>
            </div>
          )}

          {usersLoading ? (
            <div className="text-sm text-[#83867C]">Cargando usuarios...</div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  {isAdmin && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 30, height: 30, borderRadius: "50%", background: user.color || "#355E3B", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: ".72rem", fontWeight: 800, flexShrink: 0 }}>
                          {user.initials || user.name?.slice(0, 2).toUpperCase()}
                        </div>
                        {user.name}
                        {user.id === currentUser?.id && <span style={{ fontSize: ".65rem", color: "var(--mu)" }}>(tú)</span>}
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`pc-chip ${user.role === "admin" ? "paid" : "pending"}`}>{user.role}</span>
                    </td>
                    <td>
                      <span className={`pc-chip ${user.is_active ? "paid" : "overdue"}`}>{user.is_active ? "Activo" : "Inactivo"}</span>
                    </td>
                    {isAdmin && (
                      <td style={{ whiteSpace: "nowrap" }}>
                        {user.id !== currentUser?.id && (
                          <>
                            <button className="btn-s" style={{ padding: "4px 10px", fontSize: ".7rem" }} onClick={() => handleResetPassword(user.id, user.name)}>
                              🔑 Reset
                            </button>{" "}
                            <button className="btn-dan" style={{ padding: "4px 10px", fontSize: ".7rem" }} onClick={() => handleDeleteUser(user.id, user.name)}>
                              🗑
                            </button>
                          </>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 5 : 4} style={{ textAlign: "center", padding: 24, color: "var(--mu)" }}>
                      Sin usuarios registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
