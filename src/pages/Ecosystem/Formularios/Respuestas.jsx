import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import EcoLayout from "../EcoLayout";
import { formService } from "@/services/formService";
import { useAppContext } from "@/context/AppContext";
import { useLocale } from "@/i18n";

const PAGE_SIZE = 25;

function exportCsv(template, submissions, localeTag, dateHeader) {
  const cols = template.fields ?? [];
  const headers = [dateHeader, ...cols.map((f) => f.label)];
  const rows = submissions.map((s) => [
    new Date(s.submitted_at).toLocaleDateString(localeTag),
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
  const { t, localeTag } = useLocale();
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
      showToast(t("forms.answers.deleted"));
    },
    onError: (err) => showError(err, t("forms.answers.deleteError")),
  });

  const handleDelete = (sub) => {
    if (!window.confirm(t("forms.answers.deleteConfirm"))) return;
    deleteMutation.mutate(sub.id);
  };

  if (loadingTemplate) {
    return (
      <EcoLayout active="formularios" title={t("forms.answers.title")} subtitle={t("forms.answers.loading")}>
        <div className="usr-empty">{t("forms.answers.loadingForm")}</div>
      </EcoLayout>
    );
  }

  const fields = template?.fields ?? [];

  return (
    <EcoLayout
      active="formularios"
      title={t("forms.answers.title")}
      subtitle={template ? `${template.name}` : ""}
    >
      <div className="section-head">
        <h3>{template?.name ?? t("forms.answers.title")}</h3>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {submissions.length > 0 && (
            <button className="usr-btn-ghost" onClick={() => exportCsv(template, submissions, localeTag, t("forms.answers.date"))}>
              {t("forms.answers.exportCsv")}
            </button>
          )}
          <button className="usr-btn-ghost" onClick={() => navigate("/ecosistema/formularios")}>
            {t("forms.answers.back")}
          </button>
        </div>
      </div>

      <div className="kpi-row" style={{ gridTemplateColumns: "repeat(3,1fr)", marginBottom: 20 }}>
        <div className="kpi">
          <div className="kpi-head"><span className="kpi-label">{t("forms.answers.total")}</span></div>
          <div className="kpi-val">{loadingSubmissions ? "—" : total}</div>
          <div className="kpi-foot">{t("forms.answers.accumulated")}</div>
        </div>
        <div className="kpi">
          <div className="kpi-head"><span className="kpi-label">{t("forms.answers.configured")}</span></div>
          <div className="kpi-val">{fields.length}</div>
          <div className="kpi-foot">{t("forms.answers.inForm")}</div>
        </div>
        <div className="kpi">
          <div className="kpi-head"><span className="kpi-label">{t("forms.answers.status")}</span></div>
          <div style={{ marginTop: 14 }}>
            <span className={`app-status ${template?.is_published ? "st-active" : "st-soon"}`}>
              {template?.is_published ? t("forms.published") : t("forms.draft")}
            </span>
          </div>
          <div className="kpi-foot" style={{ marginTop: 8 }}>
            {template?.is_published ? t("forms.answers.activeLink") : t("forms.answers.inactiveLink")}
          </div>
        </div>
      </div>

      <div className="fom-resp-wrap">
        <div className="fom-resp-head">
          <div>
            <div className="fom-resp-title">{t("forms.answers.received")}</div>
            <div className="fom-resp-sub">
              {t("forms.answers.totalPage").replace("{total}", total).replace("{page}", page).replace("{pages}", totalPages)}
            </div>
          </div>
        </div>

        {loadingSubmissions ? (
          <div className="fom-resp-empty">{t("forms.answers.loadingAnswers")}</div>
        ) : submissions.length === 0 ? (
          <div className="fom-resp-empty">
            <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--deep)", marginBottom: 6 }}>{t("forms.answers.noAnswers")}</div>
            <div style={{ fontSize: 12.5, color: "var(--text3)" }}>
              {template?.is_published
                ? t("forms.answers.shareHint")
                : t("forms.answers.publishHint")}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="fom-resp-table">
              <thead>
                <tr>
                  <th>{t("forms.answers.date")}</th>
                  {fields.map((f) => <th key={f.id}>{f.label}</th>)}
                  {isAdmin && <th style={{ width: 40 }} />}
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => (
                  <tr key={s.id}>
                    <td style={{ color: "var(--text3)", whiteSpace: "nowrap" }}>
                      {new Date(s.submitted_at).toLocaleDateString(localeTag, {
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
                          title={t("forms.answers.deleteAnswer")}
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
              {t("forms.answers.previous")}
            </button>
            <span>{t("forms.answers.pageOf").replace("{page}", page).replace("{pages}", totalPages)}</span>
            <button
              className="usr-btn-ghost"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
              style={{ padding: "7px 14px" }}
            >
              {t("forms.answers.next")}
            </button>
          </div>
        )}
      </div>
    </EcoLayout>
  );
}

export default EcosystemFormRespuestas;
