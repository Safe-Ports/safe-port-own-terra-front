import { useState } from "react";
import { LandsGuideContext } from "@/context/LandsGuideContext";
import EcoLayout from "./EcoLayout";
import SettingsPage from "@/pages/Settings";

// Configuración es una única página (datos de la organización, plan y facturación)
// que se alcanza desde los dos shells de la app. Renderizarla siempre en el de
// Lands hacía que entrar desde el Core pareciera un salto de app: cambiaba el
// sidebar y el branding. Esta ruta la sirve con el shell del Core, para que el
// usuario se quede donde estaba; /configuracion sigue sirviéndola con el de Lands.
//
// Proveemos LandsGuideContext igual que AppShell porque la página registra ahí su
// guía; sin el provider el botón de ayuda desaparecería solo en este shell.
function EcosystemConfiguracion() {
  const [guideAction, setGuideAction] = useState(null);

  return (
    <LandsGuideContext.Provider value={setGuideAction}>
      <EcoLayout
        active="config"
        title="Configuración"
        subtitle="Organización, plan y facturación"
        onGuide={guideAction || undefined}
      >
        {/* .lands-embed exime a este subárbol del reset universal del Core
            (ver ecosystem.css): sin él la página pierde todos sus espacios. */}
        <div className="lands-embed">
          <SettingsPage />
        </div>
      </EcoLayout>
    </LandsGuideContext.Provider>
  );
}

export default EcosystemConfiguracion;
