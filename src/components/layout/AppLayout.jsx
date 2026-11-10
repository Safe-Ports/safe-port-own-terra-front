import { Outlet } from "react-router-dom";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import GlobalSearchModal from "@/components/ui/GlobalSearchModal";

function AppLayout({ pathname, children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main">
        <Topbar pathname={pathname} />
        <div className="content">
          <div className="view active">
            <div className="view-scroll">{children || <Outlet />}</div>
          </div>
        </div>
      </div>
      <GlobalSearchModal />
    </div>
  );
}

export default AppLayout;
