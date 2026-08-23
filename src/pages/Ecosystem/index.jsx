import { useState } from "react";
import GuideModal from "@/components/shared/GuideModal";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "@/context/AppContext";
import EcoLayout from "./EcoLayout";

function EcosystemHub() {
  const navigate = useNavigate();
  const { canAccessApp, showToast } = useAppContext();
  const [showGuide, setShowGuide] = useState(false);

  const openLands = () => canAccessApp("lands")
    ? navigate("/dashboard")
    : showToast("Tu usuario no tiene acceso a OwnTerra Lands", "warning");

  const openFinanzas = () => canAccessApp("finanzas")
    ? navigate("/finanzas")
    : showToast("Tu usuario no tiene acceso a Finanzas", "warning");

  return (
    <EcoLayout active="panel" title="Ecosistema Inmobiliario" onGuide={() => setShowGuide(true)}>

      {/* APP LAUNCHER */}
      <div className="section-head">
        <h3>Tus aplicaciones</h3>
      </div>
      <div className="app-launcher" data-tour="apps">

        <div className={`app-card ${!canAccessApp("lands") ? "is-disabled" : ""}`} style={{ "--glow": "rgba(111,175,107,.1)" }} onClick={openLands} role="button" tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openLands()}>
          <div className="app-top">
            <div className="app-icon ic-lands"><svg><use href="#eco-g-lands" /></svg></div>
            <span className="app-status st-active">Activo</span>
          </div>
          <div className="app-name">OwnTerra Lands</div>
          <div className="app-handle">terra.lands</div>
          <div className="app-desc">Lotificación, trazo y subdivisión de terrenos con planos topográficos y control de preventas.</div>
          <div className="app-tags"><span className="atag">Planos DWG/PDF</span><span className="atag">Compraventa</span><span className="atag">Enganches</span></div>
          <div className="app-cta">
            <span className={`app-open ${!canAccessApp("lands") ? "disabled" : ""}`}>{canAccessApp("lands") ? "Ingresar al módulo" : "Sin acceso asignado"}</span>
            <span className={`app-arrow ${!canAccessApp("lands") ? "disabled" : ""}`}>→</span>
          </div>
        </div>

        <div className="app-card is-disabled" style={{ "--glow": "rgba(53,94,59,.1)", userSelect: "none" }} aria-disabled="true" tabIndex={-1}>
          <div className="app-top">
            <div className="app-icon ic-neighb"><svg><use href="#eco-g-neighb" /></svg></div>
            <span className="app-status st-soon">Próximamente</span>
          </div>
          <div className="app-name">OwnTerra Properties</div>
          <div className="app-handle">terra.properties</div>
          <div className="app-desc">Departamentos y fraccionamientos residenciales: cuotas de mantenimiento y normativa de colonos.</div>
          <div className="app-tags"><span className="atag">Cuotas</span><span className="atag">Amenidades</span><span className="atag">Reglamento</span></div>
          <div className="app-cta">
            <span className="app-open disabled">En desarrollo</span>
            <span className="app-arrow disabled">→</span>
          </div>
        </div>

        <div className="app-card is-disabled" style={{ "--glow": "rgba(167,203,161,.14)", userSelect: "none" }} aria-disabled="true" tabIndex={-1}>
          <div className="app-top">
            <div className="app-icon ic-homes"><svg><use href="#eco-g-homes" /></svg></div>
            <span className="app-status st-soon">Próximamente</span>
          </div>
          <div className="app-name">OwnTerra Construction</div>
          <div className="app-handle">terra.construction</div>
          <div className="app-desc">Construcción y desarrollos habitacionales: avance de obra, acabados, garantías y postventa.</div>
          <div className="app-tags"><span className="atag">Avance de obra</span><span className="atag">Acabados</span><span className="atag">Postventa</span></div>
          <div className="app-cta">
            <span className="app-open disabled">En desarrollo</span>
            <span className="app-arrow disabled">→</span>
          </div>
        </div>

        <div className={`app-card ${!canAccessApp("finanzas") ? "is-disabled" : ""}`} style={{ "--glow": "rgba(64,105,153,.14)" }} onClick={openFinanzas} role="button" tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openFinanzas()}>
          <div className="app-top">
            <div className="app-icon ic-finanzas"><svg><use href="#eco-g-finanzas" /></svg></div>
            <span className="app-status st-active">Activo</span>
          </div>
          <div className="app-name">Finanzas</div>
          <div className="app-handle">terra.finanzas</div>
          <div className="app-desc">Ingresos y egresos consolidados de todo el ecosistema, con cobranza y utilidad neta.</div>
          <div className="app-tags"><span className="atag">Ingresos</span><span className="atag">Egresos</span><span className="atag">Utilidad neta</span></div>
          <div className="app-cta">
            <span className={`app-open ${!canAccessApp("finanzas") ? "disabled" : ""}`}>{canAccessApp("finanzas") ? "Ingresar al módulo" : "Sin acceso asignado"}</span>
            <span className={`app-arrow ${!canAccessApp("finanzas") ? "disabled" : ""}`}>→</span>
          </div>
        </div>

      </div>

      <GuideModal
        open={showGuide}
        onClose={() => setShowGuide(false)}
        title="Ecosistema OwnTerra"
        subtitle="Hub central de todas las aplicaciones verticales del ecosistema."
        steps={[
          { title: "Lanzador de apps", text: "Las tarjetas muestran las apps disponibles. OwnTerra Lands y Finanzas están activas. Properties y Construction están en desarrollo (próximamente)." },
          { title: "Ingresar a Lands", text: "Haz clic en la tarjeta de OwnTerra Lands para acceder al módulo de gestión de lotes, clientes y cobranza de fraccionamientos." },
          { title: "Ingresar a Finanzas", text: "Haz clic en la tarjeta de Finanzas para ver ingresos, egresos, cuentas por cobrar/pagar y reportes de todo el ecosistema." },
        ]}
      />
    </EcoLayout>
  );
}

export default EcosystemHub;
