import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import EcoLayout from "../EcoLayout";
import { formService } from "@/services/formService";
import { useAppContext } from "@/context/AppContext";

const PAGE_SIZE = 25;

function exportCsv(template, submissions) {
  const cols = template.fields ?? [];
  const headers = ["Fecha", ...cols.map((f) => f.label)];
  const rows = submissions.map((s) => [
    new Date(s.submitted_at).toLocaleDateString("es-MX"),
    ...cols.map((f) => s.data?.[f.id] ?? ""),
  ]);
  const escape = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }));
  a.download = `${template.name.replace(/[^a-z0-9]/gi, "_")}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function EcosystemFormRespuestas() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { id } = useParams();
  const { showToast, showError, currentUser } = useAppContext();
  const [page, setPage] = useState(1);

  const isAdmin = ["admin", "owner", "superadmin"].includes((currentUser?.role ?? "").toLowerCase());

  const { data: template, isLoading: loadingTemplate } = useQuery({
    queryKey: ["form-template", id],
    queryFn: () => formService.get(id),
  });

  const { data: submissionsData, isLoading: loadingSubmissions } = useQuery({
    queryKey: ["form-submissions", id, page],
    queryFn: () => formService.getSubmissions(id, { page, limit: PAGE_SIZE }),
    enabled: !!id,
  });

  const submissions = submissionsData?.items ?? [];
  const total = submissionsData?.total ?? 0;
  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  const deleteMutation = useMutation({
    mutationFn: formService.removeSubmission,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["form-submissions", id] });
      qc.invalidateQueries({ queryKey: ["form-templates"] });
      showToast("Respuesta eliminada");
    },
    onError: (err) => showError(err, "Error al eliminar"),
  });

  const handleDelete = (sub) => {
    if (!window.confirm("¿Eliminar esta respuesta?")) return;
    deleteMutation.mutate(sub.id);
  };

  if (loadingTemplate) {
    return (
      <EcoLayout active="formularios" title="Respuestas" subtitle="Cargando…">
        <div className="usr-empty">Cargando formulario…</div>
      </EcoLayout>
    );
  }

  const fields = template?.fields ?? [];

  return (
    <EcoLayout
      active="formularios"
      title="Respuestas"
      subtitle={template ? `${template.name}` : ""}
    >
      <div className="section-head">
        <h3>{template?.name ?? "Respuestas"}</h3>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {submissions.length > 0 && (
            <button className="usr-btn-ghost" onClick={() => exportCsv(template, submissions)}>
              Exportar CSV
            </button>
          )}
          <button className="usr-btn-ghost" onClick={() => navigate("/ecosistema/formularios")}>
            ← Formularios
          </button>
        </div>
      </div>

      <div className="kpi-row" style={{ gridTemplateColumns: "repeat(3,1fr)", marginBottom: 20 }}>
        <div className="kpi">
          <div className="kpi-head"><span className="kpi-label">Total de respuestas</span></div>
          <div className="kpi-val">{loadingSubmissions ? "—" : total}</div>
          <div className="kpi-foot">Acumuladas hasta hoy</div>
        </div>
        <div className="kpi">
          <div className="kpi-head"><span className="kpi-label">Campos configurados</span></div>
          <div className="kpi-val">{fields.length}</div>
          <div className="kpi-foot">En este formulario</div>
        </div>
        <div className="kpi">
          <div className="kpi-head"><span className="kpi-label">Estado del formulario</span></div>
          <div style={{ marginTop: 14 }}>
            <span className={`app-status ${template?.is_published ? "st-active" : "st-soon"}`}>
              {template?.is_published ? "Publicado" : "Borrador"}
            </span>
          </div>
          <div className="kpi-foot" style={{ marginTop: 8 }}>
            {template?.is_published ? "Link activo para captura" : "Sin link activo"}
          </div>
        </div>
      </div>

      <div className="fom-resp-wrap">
        <div className="fom-resp-head">
          <div>
            <div className="fom-resp-title">Respuestas recibidas</div>
            <div className="fom-resp-sub">
              {total} en total · página {page}/{totalPages}
            </div>
          </div>
        </div>

        {loadingSubmissions ? (
          <div className="fom-resp-empty">Cargando respuestas…</div>
        ) : submissions.length === 0 ? (
          <div className="fom-resp-empty">
            <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--deep)", marginBottom: 6 }}>Sin respuestas aún</div>
            <div style={{ fontSize: 12.5, color: "var(--text3)" }}>
              {template?.is_published
                ? "Comparte el link del formulario para empezar a recibir datos."
                : "Publica el formulario primero para habilitar el link de captura."}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="fom-resp-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  {fields.map((f) => <th key={f.id}>{f.label}</th>)}
                  {isAdmin && <th style={{ width: 40 }} />}
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => (
                  <tr key={s.id}>
                    <td style={{ color: "var(--text3)", whiteSpace: "nowrap" }}>
                      {new Date(s.submitted_at).toLocaleDateString("es-MX", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </td>
                    {fields.map((f) => (
                      <td key={f.id} title={s.data?.[f.id] ?? ""}>
                        {s.data?.[f.id] || <span style={{ color: "var(--text3)" }}>—</span>}
                      </td>
                    ))}
                    {isAdmin && (
                      <td>
                        <button
                          className="usr-dl"
                          title="Eliminar respuesta"
                          onClick={() => handleDelete(s)}
                          disabled={deleteMutation.isPending}
                          style={{ color: "#C0392B", fontSize: 16 }}
                        >
                          ×
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="fom-pager">
            <button
              className="usr-btn-ghost"
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 1}
              style={{ padding: "7px 14px" }}
            >
              ← Anterior
            </button>
            <span>Página {page} de {totalPages}</span>
            <button
              className="usr-btn-ghost"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
              style={{ padding: "7px 14px" }}
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>
    </EcoLayout>
  );
}

export default EcosystemFormRespuestas;
