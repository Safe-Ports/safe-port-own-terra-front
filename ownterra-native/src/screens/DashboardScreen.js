import { StyleSheet, View } from "react-native";
import ScreenShell from "../components/ScreenShell";
import { HighlightCard, ListRow, Panel, StatCard } from "../components/Cards";
import { alerts, projects, stats } from "../data/mockData";

export default function DashboardScreen() {
  return (
    <ScreenShell
      eyebrow="Ownterra Native"
      title="Dashboard"
      subtitle="Una vista nativa para vendedores y backoffice, enfocada en operación rápida desde celular."
    >
      <HighlightCard
        eyebrow="Experiencia instalada"
        title="Tu CRM inmobiliario como app real"
        subtitle="Tabs nativas, scroll táctil, jerarquía móvil y layout pensado primero para teléfono."
      />

      <View style={styles.statsGrid}>
        <StatCard label="Ingreso del mes" value={stats.monthlyRevenue} />
        <StatCard label="Lotes activos" value={stats.activeLots} tone="success" />
      </View>
      <View style={styles.statsGrid}>
        <StatCard label="Vendidos" value={stats.soldLots} />
        <StatCard label="Vencidos" value={stats.overduePayments} tone="danger" />
      </View>

      <Panel title="Proyectos" action="Ver todos">
        {projects.map((project) => (
          <ListRow
            key={project.id}
            title={project.name}
            subtitle={`${project.available} libres · ${project.sold} vendidos · ${project.inventoryValue}`}
            badge={`${project.reserved} res.`}
            tone="success"
          />
        ))}
      </Panel>

      <Panel title="Alertas activas" action="Cobranza">
        {alerts.map((alert) => (
          <ListRow
            key={alert.id}
            title={alert.title}
            subtitle={alert.subtitle}
            badge={alert.tone === "danger" ? "crítico" : alert.tone === "warning" ? "pendiente" : "ok"}
            tone={alert.tone === "danger" ? "danger" : alert.tone === "success" ? "success" : "neutral"}
          />
        ))}
      </Panel>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
});
