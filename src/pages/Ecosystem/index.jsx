import { useState } from "react";
import GuideModal from "@/components/shared/GuideModal";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "@/context/AppContext";
import EcoLayout from "./EcoLayout";

function EcosystemHub() {
  const navigate = useNavigate();
  const { canAccessApp, canUseFeature, showToast } = useAppContext();
  const [showGuide, setShowGuide] = useState(false);

  const openLands = () => canAccessApp("lands")
    ? navigate("/dashboard")
    : showToast("Tu usuario no tiene acceso a OwnTerra Lands", "warning");

  const openConstruct = () => canAccessApp("construct")
    ? navigate("/construccion")
    : showToast("Tu usuario no tiene acceso a Ownterra Construct", "warning");

  const openProperties = () => canAccessApp("properties")
    ? navigate("/properties")
    : showToast("Tu usuario no tiene acceso a OwnTerra Properties", "warning");

  const openVault = () => canUseFeature("core.vault")
    ? navigate("/ecosistema/documentos")
    : showToast("Tu usuario no tiene acceso a OwnTerra Vault", "warning");

  const openFormularios = () => canUseFeature("core.forms")
    ? navigate("/ecosistema/formularios")
    : showToast("Tu usuario no tiene acceso a Formularios", "warning");

  const openProveedores = () => canUseFeature("core.providers")
    ? navigate("/ecosistema/proveedores")
    : showToast("Tu usuario no tiene acceso a Proveedores", "warning");

  return (
    <EcoLayout active="panel" title="Hub de aplicaciones" subtitle="Todas las apps del ecosistema" onGuide={() => setShowGuide(true)}>

      {/* APLICACIONES CORE */}
      <div className="section-head">
        <h3>Aplicaciones Core</h3>
      </div>
      <p className="gallery-section-sub">Los productos principales del ecosistema</p>
      <div className="app-launcher" data-tour="apps">

        <div className={`app-card ${!canAccessApp("lands") ? "is-disabled" : ""}`} style={{ "--tone": "#6FAF6B", "--foto": "url(/apps/lands.jpg)" }} onClick={openLands} role="button" tabIndex={0}
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

        <div className={`app-card ${!canAccessApp("properties") ? "is-disabled" : ""}`} style={{ "--tone": "#355E3B", "--foto": "url(/apps/properties.jpg)" }} onClick={openProperties} role="button" tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openProperties()}>
          <div className="app-top">
            <div className="app-icon ic-properties"><svg><use href="#eco-g-neighb" /></svg></div>
            <span className="app-status st-active">Activo</span>
          </div>
          <div className="app-name">OwnTerra Properties</div>
          <div className="app-handle">terra.properties</div>
          <div className="app-desc">Administra comunidades, rentas y comercialización de inmuebles desde un portafolio conectado.</div>
          <div className="app-tags"><span className="atag">Condominios</span><span className="atag">Rentas</span><span className="atag">Venta</span></div>
          <div className="app-cta">
            <span className={`app-open ${!canAccessApp("properties") ? "disabled" : ""}`}>{canAccessApp("properties") ? "Ingresar al módulo" : "Sin acceso asignado"}</span>
            <span className={`app-arrow ${!canAccessApp("properties") ? "disabled" : ""}`}>→</span>
          </div>
        </div>

        <div className={`app-card ${!canAccessApp("construct") ? "is-disabled" : ""}`} style={{ "--tone": "#D9A867", "--foto": "url(/apps/construction.jpg)" }} onClick={openConstruct} role="button" tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openConstruct()}>
          <div className="app-top">
            <div className="app-icon ic-construct"><svg><use href="#eco-g-construct" /></svg></div>
            <span className="app-status st-active">Activo</span>
          </div>
          <div className="app-name">Ownterra Construct</div>
          <div className="app-handle">terra.construct</div>
          <div className="app-desc">ERP de construcción: cuantificación física con números generadores, presupuestos híbridos APU/Alzado y catálogo maestro de obra.</div>
          <div className="app-tags"><span className="atag">Números generadores</span><span className="atag">APU / Alzado</span><span className="atag">Catálogo maestro</span></div>
          <div className="app-cta">
            <span className={`app-open ${!canAccessApp("construct") ? "disabled" : ""}`}>{canAccessApp("construct") ? "Ingresar al módulo" : "Sin acceso asignado"}</span>
            <span className={`app-arrow ${!canAccessApp("construct") ? "disabled" : ""}`}>→</span>
          </div>
        </div>

      </div>

      {/* APLICACIONES TRANSVERSALES */}
      <div className="section-head" style={{ marginTop: 36 }}>
        <h3>Aplicaciones transversales</h3>
      </div>
      <p className="gallery-section-sub">Servicios compartidos por Lands, Properties y Construction</p>
      <div className="app-launcher vertical-launcher" data-tour="apps-verticales">

        <div className="app-card" data-tour="app-agenda" onClick={() => navigate("/ecosistema/agenda")} role="button" tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate("/ecosistema/agenda")}>
          <div className="app-top">
            <div className="app-icon ic-neutral"><svg><use href="#eco-n-calendar" /></svg></div>
            <span className="app-status st-active">Activo</span>
          </div>
          <div className="app-name">Calendario</div>
          <div className="app-desc">Agenda y citas del equipo — eventos, recordatorios y reuniones.</div>
          <div className="app-cta">
            <span className="app-open">Abrir</span>
            <span className="app-arrow">→</span>
          </div>
        </div>

        <div className="app-card" data-tour="app-miday" onClick={() => navigate("/ecosistema/mi-dia")} role="button" tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate("/ecosistema/mi-dia")}>
          <div className="app-top">
            <div className="app-icon ic-neutral"><svg><use href="#eco-n-sun" /></svg></div>
            <span className="app-status st-active">Activo</span>
          </div>
          <div className="app-name">Mi Día</div>
          <div className="app-desc">Tu jornada consolidada: citas de hoy, pagos por cobrar y lo que requiere tu atención.</div>
          <div className="app-cta">
            <span className="app-open">Abrir</span>
            <span className="app-arrow">→</span>
          </div>
        </div>

        <div className={`app-card ${!canUseFeature("core.forms") ? "is-disabled" : ""}`} onClick={openFormularios} role="button" tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openFormularios()}>
          <div className="app-top">
            <div className="app-icon ic-neutral"><svg><use href="#eco-n-forms" /></svg></div>
            <span className="app-status st-active">Activo</span>
          </div>
          <div className="app-name">Formularios</div>
          <div className="app-desc">Constructor de formularios públicos y captura de respuestas.</div>
          <div className="app-cta">
            <span className={`app-open ${!canUseFeature("core.forms") ? "disabled" : ""}`}>{canUseFeature("core.forms") ? "Abrir" : "Sin acceso"}</span>
            <span className={`app-arrow ${!canUseFeature("core.forms") ? "disabled" : ""}`}>→</span>
          </div>
        </div>

        <div className={`app-card ${!canUseFeature("core.providers") ? "is-disabled" : ""}`} onClick={openProveedores} role="button" tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openProveedores()}>
          <div className="app-top">
            <div className="app-icon ic-neutral"><svg><use href="#eco-n-box" /></svg></div>
            <span className="app-status st-active">Activo</span>
          </div>
          <div className="app-name">Proveedores</div>
          <div className="app-desc">Registro de terceros y contratistas, compartido entre verticales.</div>
          <div className="app-cta">
            <span className={`app-open ${!canUseFeature("core.providers") ? "disabled" : ""}`}>{canUseFeature("core.providers") ? "Abrir" : "Sin acceso"}</span>
            <span className={`app-arrow ${!canUseFeature("core.providers") ? "disabled" : ""}`}>→</span>
          </div>
        </div>

        <div className={`app-card ${!canUseFeature("core.vault") ? "is-disabled" : ""}`} onClick={openVault} role="button" tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openVault()}>
          <div className="app-top">
            <div className="app-icon ic-neutral"><svg><use href="#eco-n-vault" /></svg></div>
            <span className="app-status st-active">Activo</span>
          </div>
          <div className="app-name">OwnTerra Vault</div>
          <div className="app-desc">Bóveda de documentos y expedientes, reutilizable por cualquier app del ecosistema.</div>
          <div className="app-cta">
            <span className={`app-open ${!canUseFeature("core.vault") ? "disabled" : ""}`}>{canUseFeature("core.vault") ? "Abrir" : "Sin acceso"}</span>
            <span className={`app-arrow ${!canUseFeature("core.vault") ? "disabled" : ""}`}>→</span>
          </div>
        </div>

        {/* Oculto por completo hasta que un admin de la org tenga el flag
            recaudacion_enabled (ver ESPEC_RECAUDACION.md §8). */}
        {canUseFeature("core.recaudacion") && (
          <div className="app-card" onClick={() => navigate("/ecosistema/recaudacion")} role="button" tabIndex={0}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate("/ecosistema/recaudacion")}>
            <div className="app-top">
              <div className="app-icon ic-neutral"><svg><use href="#eco-n-card" /></svg></div>
              <span className="app-status st-active">Activo</span>
            </div>
            <div className="app-name">Centro de Recaudación</div>
            <div className="app-desc">Cuentas bancarias, links de cobro y tablero de pagos (Stripe). El dinero va directo a la inmobiliaria.</div>
            <div className="app-cta">
              <span className="app-open">Abrir</span>
              <span className="app-arrow">→</span>
            </div>
          </div>
        )}

      </div>

      <GuideModal
        open={showGuide}
        onClose={() => setShowGuide(false)}
        title="Hub de aplicaciones"
        subtitle="Todas las apps del ecosistema, en un solo lugar."
        steps={[
          { title: "Aplicaciones Core", text: "Los tres productos principales del ecosistema. OwnTerra Lands, OwnTerra Properties y Ownterra Construct están activos." },
          { title: "Ingresar a Lands", text: "Haz clic en la tarjeta de OwnTerra Lands para acceder al módulo de gestión de lotes, clientes y cobranza de fraccionamientos." },
          { title: "Ingresar a Properties", text: "Haz clic en OwnTerra Properties para administrar tus comunidades: unidades, residentes, cuotas, avisos y amenidades." },
          { title: "Aplicaciones Verticales", text: "Servicios compartidos por todas las apps core: Calendario, Mi Día, Formularios, Proveedores y OwnTerra Vault." },
          { title: "Ingresar a una app", text: "Haz clic en cualquier tarjeta activa para entrar. Las que aún no tienes asignadas se marcan como \"Sin acceso\" — pídele a un administrador que te las habilite en Equipo." },
        ]}
      />
    </EcoLayout>
  );
}

export default EcosystemHub;
