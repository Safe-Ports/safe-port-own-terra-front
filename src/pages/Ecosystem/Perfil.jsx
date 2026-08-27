import { useState } from "react";
import GuideModal from "@/components/shared/GuideModal";
import ProfileContent, { PROFILE_GUIDE_STEPS } from "@/pages/Profile/ProfileContent";
import EcoLayout from "./EcoLayout";

// El perfil servido con el shell del Core. Es la misma página que /perfil: el
// perfil es transversal, no de una vertical, así que abrirlo desde el Hub no
// debería mandarte a Lands ni mostrarte indicadores de una app en la que quizá
// ni entraste.
//
// .lands-embed exime al subárbol del reset universal del Core (ver
// ecosystem.css), que si no le borra márgenes y paddings a la página.
function EcosystemPerfil() {
  const [showGuide, setShowGuide] = useState(false);

  return (
    <EcoLayout
      active="perfil"
      title="Perfil"
      subtitle="Tu cuenta en el ecosistema"
      onGuide={() => setShowGuide(true)}
    >
      <div className="lands-embed">
        <ProfileContent />
      </div>
      <GuideModal
        open={showGuide}
        onClose={() => setShowGuide(false)}
        title="Mi perfil"
        subtitle="Tus datos, tus accesos y tu organización."
        steps={PROFILE_GUIDE_STEPS}
      />
    </EcoLayout>
  );
}

export default EcosystemPerfil;
