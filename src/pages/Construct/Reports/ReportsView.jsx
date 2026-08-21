import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as constructService from "@/services/constructService";
import AnnexA from "./AnnexA";
import AnnexB from "./AnnexB";
import CoverSheet from "./CoverSheet";

const TABS = [
  { key: "annexA", label: "Anexo A · APU" },
  { key: "annexB", label: "Anexo B · Alzado" },
  { key: "cover", label: "Carátula general" },
];

/* No se puede mezclar peras con manzanas: el PRD exige que el APU vaya
   separado del Precio Alzado — de ahí los dos anexos independientes. */
function ReportsView({ project }) {
  const [tab, setTab] = useState("annexA");

  const { data: concepts = [] } = useQuery({ queryKey: ["construct-concepts", project.id], queryFn: () => constructService.listConcepts(project.id) });
  const { data: nodes = [] } = useQuery({ queryKey: ["construct-nodes", project.id], queryFn: () => constructService.listWbsNodes(project.id) });
  const { data: insumos = [] } = useQuery({ queryKey: ["construct-insumos"], queryFn: constructService.listInsumos });
  const { data: basicos = [] } = useQuery({ queryKey: ["construct-basicos"], queryFn: constructService.listBasicos });
  const catalog = { insumos, basicos };

  return (
    <div>
      <div className="obr-tabs">
        {TABS.map((t) => <button key={t.key} type="button" className={tab === t.key ? "active" : ""} onClick={() => setTab(t.key)}>{t.label}</button>)}
      </div>
      {tab === "annexA" && <AnnexA project={project} concepts={concepts} catalog={catalog} />}
      {tab === "annexB" && <AnnexB project={project} concepts={concepts} catalog={catalog} />}
      {tab === "cover" && <CoverSheet project={project} concepts={concepts} nodes={nodes} catalog={catalog} />}
    </div>
  );
}

export default ReportsView;
