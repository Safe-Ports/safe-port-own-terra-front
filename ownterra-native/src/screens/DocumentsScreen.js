import ScreenShell from "../components/ScreenShell";
import { ListRow, Panel } from "../components/Cards";
import { documents } from "../data/mockData";

export default function DocumentsScreen() {
  return (
    <ScreenShell eyebrow="Archivo" title="Documentos" subtitle="Subida, consulta y revisión documental en una navegación que se siente nativa.">
      <Panel title="Gestión documental" action="Subir">
        {documents.map((document) => (
          <ListRow
            key={document.id}
            title={document.name}
            subtitle={`${document.category} · ${document.link}`}
            badge={document.state}
            tone={document.state === "Pendiente" ? "danger" : "success"}
          />
        ))}
      </Panel>
    </ScreenShell>
  );
}
