import { HiBars3, HiMagnifyingGlass } from "react-icons/hi2";
import { useAppContext } from "@/context/AppContext";
import { useLocale } from "@/i18n";
import CoreTopbarActions from "./CoreTopbarActions";

function Topbar({ pathname, onGuide }) {
  const { openModal, toggleSidebar } = useAppContext();
  const { t } = useLocale();

  const title = t(`routes.${pathname}`, t("topbar.defaultTitle"));
  const subtitle = t(`topbar.subtitle.${pathname}`, t("topbar.defaultSubtitle"));

  return (
    <header className="topbar">
      <div className="flex items-center gap-3">
        <button className="mobile-menu-btn" onClick={toggleSidebar} aria-label={t("nav.menu")}>
          <HiBars3 />
        </button>
        <div className="topbar-heading">
          <div className="topbar-title">{title}</div>
          <div className="topbar-sub">{subtitle}</div>
        </div>
      </div>
      <div className="topbar-r">
        <button className="tb-src" onClick={() => openModal("globalSearch")}>
          <span style={{ color: "var(--mu)" }}>
            <HiMagnifyingGlass />
          </span>
          <span className="flex-1 text-left">{t("topbar.searchPlaceholder")}</span>
          <span className="tb-shortcut">⌘K</span>
        </button>

        <CoreTopbarActions onGuide={onGuide} />
      </div>
    </header>
  );
}

export default Topbar;
