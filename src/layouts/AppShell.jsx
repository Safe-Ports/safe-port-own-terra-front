import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "@/components/layout/Sidebar";
import EcoSprite from "@/pages/Ecosystem/EcoSprite";
import Topbar from "@/components/layout/Topbar";
import { LandsGuideContext } from "@/context/LandsGuideContext";
import GlobalSearchModal from "@/components/ui/GlobalSearchModal";
import DocumentPreviewModal from "@/components/shared/DocumentPreviewModal";
import ClientReportModal from "@/components/shared/ClientReportModal";
import ContractModal from "@/components/shared/ContractModal";
import DocumentModal from "@/components/shared/DocumentModal";
import Toast from "@/components/shared/Toast"

function AppShell() {
  const location = useLocation();
  const [guideAction, setGuideAction] = useState(null);

  return (
    <LandsGuideContext.Provider value={setGuideAction}>
      <div className="app-shell">
        {/* Sprite de iconos del ecosistema: lo usa el lanzador de apps de la
            barra superior, que también vive en las verticales. */}
        <EcoSprite />
        <Sidebar />
        <div className="main">
          <Topbar pathname={location.pathname} onGuide={guideAction} />
          <div className="content">
            <div className="view active">
              <div className="view-scroll">
                <Outlet />
              </div>
            </div>
          </div>
        </div>

        <GlobalSearchModal />
        <DocumentPreviewModal />
        <ClientReportModal />
        <ContractModal />
        <DocumentModal />
        <Toast />
      </div>
    </LandsGuideContext.Provider>
  );
}

export default AppShell;
