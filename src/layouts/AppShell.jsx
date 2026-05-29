import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import GlobalSearchModal from "@/components/ui/GlobalSearchModal";
import DocumentPreviewModal from "@/components/shared/DocumentPreviewModal";
import ClientReportModal from "@/components/shared/ClientReportModal";
import ContractModal from "@/components/shared/ContractModal";
import DocumentModal from "@/components/shared/DocumentModal";
import Toast from "@/components/shared/Toast";

function AppShell() {
  const location = useLocation();

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main">
        <Topbar pathname={location.pathname} />
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
  );
}

export default AppShell;
