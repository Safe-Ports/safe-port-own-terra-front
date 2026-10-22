import { Outlet } from "react-router-dom";
import { useRef } from "react";
import EcoLayout from "@/pages/Ecosystem/EcoLayout";
import InlineError from "@/components/shared/InlineError";
import { parseApiError } from "@/errors/parseApiError";
import { usePropertiesData } from "../data/PropertiesDataContext";

// No mostrar portafolios vacíos ni acciones antes de conocer el resultado real.
function PropertiesWorkspace() {
  const { propertiesLoading, propertiesError, retryProperties } = usePropertiesData();
  const initialized = useRef(false);
  if (!propertiesLoading && !propertiesError) initialized.current = true;
  // Las invalidaciones posteriores no deben desmontar formularios ni perder tokens
  // de inscripción que el servidor entrega una sola vez.
  if (!propertiesError && (!propertiesLoading || initialized.current)) return <Outlet />;
  return <EcoLayout active="properties" title="OwnTerra Properties" subtitle="Espacio de trabajo"><main className="properties-workspace-state" aria-busy={Boolean(propertiesLoading)}>
    {propertiesLoading ? <div role="status"><h1>Cargando Properties</h1><p>Estamos preparando las comunidades y el portafolio de tu organización.</p></div> : <><h1>No pudimos cargar Properties</h1><InlineError error={parseApiError(propertiesError)} /><button type="button" onClick={retryProperties}>Reintentar</button></>}
  </main></EcoLayout>;
}

export default PropertiesWorkspace;
