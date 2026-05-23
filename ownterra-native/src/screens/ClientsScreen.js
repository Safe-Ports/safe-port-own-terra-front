import ScreenShell from "../components/ScreenShell";
import { ListRow, Panel } from "../components/Cards";
import { clients } from "../data/mockData";

export default function ClientsScreen() {
  return (
    <ScreenShell eyebrow="CRM" title="Clientes" subtitle="Lista compacta, legible y pensada para seguimiento comercial desde campo.">
      <Panel title="Expedientes" action="+ Nuevo">
        {clients.map((client) => (
          <ListRow
            key={client.id}
            title={client.name}
            subtitle={`${client.plan} · ${client.seller}`}
            badge={client.status}
            tone={client.status === "Vencido" ? "danger" : "success"}
          />
        ))}
      </Panel>
    </ScreenShell>
  );
}
