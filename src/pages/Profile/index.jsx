import { useState } from "react";
import { useLandsGuide } from "@/context/LandsGuideContext";
import GuideModal from "@/components/shared/GuideModal";
import ProfileContent, { PROFILE_GUIDE_STEPS } from "./ProfileContent";

// El perfil servido con el shell de Lands (/perfil). El contenido es el mismo
// que en /ecosistema/perfil: quién sos y a qué entrás no cambia según la app
// desde la que abras. Lo único que cambia es la shell que lo envuelve, para no
// sacarte de donde estabas (mismo criterio que Ecosystem/Configuracion.jsx).
function ProfilePage() {
  const [showGuide, setShowGuide] = useState(false);
  useLandsGuide(() => setShowGuide(true));

  return (
    <>
      <ProfileContent />
      <GuideModal
        open={showGuide}
        onClose={() => setShowGuide(false)}
        title="Mi perfil"
        subtitle="Tus datos, tus accesos y tu organización."
        steps={PROFILE_GUIDE_STEPS}
      />
    </>
  );
}

export default ProfilePage;
