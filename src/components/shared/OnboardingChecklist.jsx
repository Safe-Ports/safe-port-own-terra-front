import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAppContext } from "@/context/AppContext";
import { orgService } from "@/services/orgService";
import "./onboarding.css";

/**
 * Checklist de bienvenida para tenants nuevos. El avance se DERIVA de datos reales
 * (fraccionamientos, lotes, clientes, contratos, pagos, equipo), así que se marca
 * solo conforme el usuario opera. Se oculta al completar todo o al cerrarlo.
 */
const DISMISS_KEY = "ot_onboarding_dismissed";
const R = 40;
const CIRC = 2 * Math.PI * R;

export default function OnboardingChecklist() {
  const navigate = useNavigate();
  const {
    fracs, clients, contracts, payments,
    fracsLoading, clientsLoading, contractsLoading, paymentsLoading,
  } = useAppContext();
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === "1");

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["users-list", "onboarding"],
    queryFn: () => orgService.listUsers({ limit: 5 }),
    staleTime: 300_000,
  });
  const usersCount = usersData?.total ?? usersData?.items?.length ?? 1;

  const steps = [
    { key: "frac",     label: "Crea tu primer fraccionamiento", desc: "Sube el plano y ponle nombre.",           to: "/lotes",         done: fracs.length > 0 },
    { key: "lots",     label: "Carga tu matriz de lotes",       desc: "Secciones, medidas y precios.",            to: "/lotes",         done: fracs.some((f) => (f.total_lots || 0) > 0) },
    { key: "client",   label: "Registra tu primer cliente",     desc: "Da de alta un prospecto en el CRM.",       to: "/clientes",      done: clients.length > 0 },
    { key: "contract", label: "Genera un contrato de compraventa", desc: "Con plan de pagos y amortización.",     to: "/contratos",     done: contracts.length > 0 },
    { key: "pay",      label: "Revisa tu cobranza",             desc: "Cuotas y recordatorios automáticos.",      to: "/pagos",         done: payments.length > 0 },
    { key: "team",     label: "Invita a tu equipo",             desc: "Vendedores y permisos por app.",           to: "/configuracion", done: usersCount > 1 },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const pct = Math.round((doneCount / steps.length) * 100);

  // No mostrar nada mientras los datos aún cargan (evita que "parpadee" en el primer
  // instante y le aparezca a una org que en realidad ya tiene todo).
  const dataLoading = fracsLoading || clientsLoading || contractsLoading || paymentsLoading || usersLoading;
  if (dataLoading) return null;

  // Se oculta al completar todos los pasos o al cerrarlo manualmente.
  if (dismissed || doneCount === steps.length) return null;

  const close = () => { localStorage.setItem(DISMISS_KEY, "1"); setDismissed(true); };

  return (
    <div className="ob-card">
      <button className="ob-close" onClick={close} title="Ocultar" aria-label="Ocultar">×</button>
      <div className="ob-hero">
        <div className="ob-ring">
          <svg width="76" height="76" viewBox="0 0 76 76">
            <circle cx="38" cy="38" r={R} fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="7" />
            <circle cx="38" cy="38" r={R} fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round"
              strokeDasharray={CIRC} strokeDashoffset={CIRC - (CIRC * pct / 100)} transform="rotate(-90 38 38)" />
          </svg>
          <div className="ob-ring-lbl"><span className="ob-rp">{pct}%</span></div>
        </div>
        <div>
          <div className="ob-h">Pon en marcha tu operación</div>
          <div className="ob-sub">Completa estos pasos para dejar todo listo · {doneCount} de {steps.length} hecho{doneCount === 1 ? "" : "s"}.</div>
        </div>
      </div>
      <div className="ob-steps">
        {steps.map((s) => (
          <div key={s.key} className={`ob-step ${s.done ? "done" : ""}`}>
            <span className="ob-check">✓</span>
            <div className="ob-step-body">
              <div className="ob-step-t">{s.label}</div>
              <div className="ob-step-d">{s.desc}</div>
            </div>
            {s.done
              ? <span className="ob-badge">Hecho</span>
              : <button className="ob-cta" onClick={() => navigate(s.to)}>Ir →</button>}
          </div>
        ))}
      </div>
    </div>
  );
}
