import { Outlet } from "react-router-dom";
import { PropertiesDataProvider } from "./data/PropertiesDataContext";
import "./components/properties-forms.css";

function PropertiesModule() {
  return (
    <PropertiesDataProvider>
      <Outlet />
    </PropertiesDataProvider>
  );
}

export default PropertiesModule;
