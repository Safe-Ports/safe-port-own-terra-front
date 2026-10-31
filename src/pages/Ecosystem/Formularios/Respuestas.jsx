import useConfirmation from "@/hooks/useConfirmation";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import EcoLayout from "../EcoLayout";
import { formService } from "@/services/formService";
import { useAppContext } from "@/context/AppContext";
import { isGlobalAdmin } from "@/services/permissions";
import { HiOutlineDocumentArrowDown } from "react-icons/hi2";
import { downloadBlankFormPdf, downloadSubmissionPdf, downloadSubmissionsPdf, formValue } from "@/services/formPdf";

const PAGE_SIZE = 25;

function exportCsv(template, submissions) {
  const cols = template.fields ?? [];
  const headers = ["Fecha", ...cols.map((f) => f.label)];
  const rows = submissions.map((s) => [
    new Date(s.submitted_at).toLocaleDateString("es-MX"),
    ...cols.map((f) => (s.data?.[f.id] == null || s.data?.[f.id] === "" ? "" : formValue(s.data[f.id]))),
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
  const { requestConfirmation, confirmationDialog } = useConfirmation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { id } = useParams();
  const { showToast, showError, currentUser } = useAppContext();
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(null);

  const isAdmin = isGlobalAdmin(currentUser);

  const { data: template, isLoading: loadingTemplate } = useQuery({
    queryKey: ["form-template", id],
    queryFn: () => formService.get(id),
  });

  const { data: submissionsData, isLoading: loadingSubmissions } = useQuery({
    queryKey: ["form-submissions", id, page],
    queryFn: () => formService.getSubmissions(id, { page, page_size: PAGE_SIZE }),
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

  // Descargas: CSV y PDF llevan TODAS las respuestas, no solo la página visible.
  const runExport = async (kind, task, errorMessage) => {
    if (exporting) return;
    setExporting(kind);
    try {
      await task();
    } catch (err) {
      showError(err, errorMessage);
    } finally {
      setExporting(null);
    }
  };
  const exportAllCsv = () => runExport("csv", async () => exportCsv(template, await formService.getAllSubmissions(id)), "No se pudo exportar el CSV");
  const exportAllPdf = () => runExport("pdf", async () => {
    await downloadSubmissionsPdf(template, await formService.getAllSubmissions(id));
    showToast("PDF de respuestas descargado");
  }, "No se pudo generar el PDF");
  const exportBlankPdf = () => runExport("blank", () => downloadBlankFormPdf(template), "No se pudo generar el PDF");
  const exportOnePdf = (sub) => runExport(sub.id, () => downloadSubmissionPdf(template, sub), "No se pudo generar el PDF");

  const handleDelete = async (sub) => {
    if (!await requestConfirmation("Deja de aparecer en la lista de respuestas de este formulario.", { title: "¿Eliminar esta respuesta?", confirmLabel: "Eliminar respuesta", danger: true })) return;
    deleteMutation.mutate(sub.id);
  };

  if (loadingTemplate) {
    return (
      <EcoLayout active="formularios" title="Respuestas" subtitle="Cargando…">{confirmationDialog}
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
    >{confirmationDialog}
      <div className="section-head">
        <h3>{template?.name ?? "Respuestas"}</h3>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {fields.length > 0 && (
            <button className="usr-btn-ghost" onClick={exportBlankPdf} disabled={Boolean(exporting)}>
              {exporting === "blank" ? "Generando…" : "Formulario en blanco (PDF)"}
            </button>
          )}
          {submissions.length > 0 && (
            <>
              <button className="usr-btn-ghost" onClick={exportAllCsv} disabled={Boolean(exporting)}>
                {exporting === "csv" ? "Exportando…" : "Exportar CSV"}
              </button>
              <button className="usr-btn-ghost" onClick={exportAllPdf} disabled={Boolean(exporting)}>
                {exporting === "pdf" ? "Generando PDF…" : "Descargar PDF"}
              </button>
            </>
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
                  <th style={{ width: isAdmin ? 72 : 40 }} />
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
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button
                        className="usr-dl"
                        title="Descargar esta respuesta en PDF"
                        aria-label="Descargar esta respuesta en PDF"
                        onClick={() => exportOnePdf(s)}
                        disabled={Boolean(exporting)}
                        style={{ fontSize: 16 }}
                      >
                        <HiOutlineDocumentArrowDown aria-hidden="true" />
                      </button>
                      {isAdmin && (
                        <button
                          className="usr-dl"
                          title="Eliminar respuesta"
                          onClick={() => handleDelete(s)}
                          disabled={deleteMutation.isPending}
                          style={{ color: "#C0392B", fontSize: 16 }}
                        >
                          ×
                        </button>
                      )}
                    </td>
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
