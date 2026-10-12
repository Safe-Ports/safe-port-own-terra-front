import PropertiesWorkspace from "./components/PropertiesWorkspace";
import { PropertiesDataProvider } from "./data/PropertiesDataContext";
import "./components/properties-forms.css";
import "./components/properties-ui.css";

function PropertiesModule() {
  return (
    <PropertiesDataProvider>
      <PropertiesWorkspace />
    </PropertiesDataProvider>
  );
}

export default PropertiesModule;
