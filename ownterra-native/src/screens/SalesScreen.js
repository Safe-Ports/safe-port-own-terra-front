import ScreenShell from "../components/ScreenShell";
import { ListRow, Panel } from "../components/Cards";
import { contracts } from "../data/mockData";

export default function SalesScreen() {
  return (
    <ScreenShell eyebrow="Operación" title="Ventas" subtitle="Repositorio de contratos y pipeline comercial en un formato nativo más limpio que la tabla de escritorio.">
      <Panel title="Contratos" action="+ Generar">
        {contracts.map((contract) => (
          <ListRow
            key={contract.id}
            title={contract.number}
            subtitle={`${contract.lot} · ${contract.amount}`}
            badge={contract.status}
            tone={contract.status === "Pendiente" ? "danger" : "success"}
          />
        ))}
      </Panel>
    </ScreenShell>
  );
}
