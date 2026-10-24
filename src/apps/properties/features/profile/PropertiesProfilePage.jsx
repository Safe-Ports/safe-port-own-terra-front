import { useState } from "react";
import GuideModal from "@/components/shared/GuideModal";
import ProfileContent, { PROFILE_GUIDE_STEPS } from "@/pages/Profile/ProfileContent";
import EcoLayout from "@/pages/Ecosystem/EcoLayout";

// El perfil servido con el shell de Properties (/properties/perfil). Mismo
// contenido que /perfil (Lands) y /ecosistema/perfil (Core): abrir tu perfil
// desde Properties no debe sacarte a otra vertical.
//
// .lands-embed exime al subárbol del reset universal del Core (ver
// ecosystem.css), igual que en Ecosystem/Perfil.jsx.
function PropertiesProfilePage() {
  const [showGuide, setShowGuide] = useState(false);

  return (
    <EcoLayout
      active="properties"
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

export default PropertiesProfilePage;
