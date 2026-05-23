import { Image, StyleSheet, Text, View } from "react-native";
import ScreenShell from "../components/ScreenShell";
import { Panel, StatCard } from "../components/Cards";
import { projects } from "../data/mockData";
import { colors } from "../theme/colors";

const lotPlan = require("../../assets/lot-plan.jpeg");

export default function LotsScreen() {
  const project = projects[0];

  return (
    <ScreenShell
      eyebrow="Inventario"
      title="Lotes"
      subtitle="Así podría verse la gestión del plano y del inventario ya en una app nativa."
    >
      <Panel title="Plano del proyecto" action="Valle Esmeralda">
        <View style={styles.planWrap}>
          <Image source={lotPlan} resizeMode="contain" style={styles.planImage} />
        </View>
      </Panel>

      <View style={styles.statsGrid}>
        <StatCard label="Disponibles" value={project.available} tone="success" />
        <StatCard label="Vendidos" value={project.sold} />
        <StatCard label="Reservados" value={project.reserved} />
      </View>

      <Panel title="Vista mobile" action="Constructor">
        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>Carga de lotes táctil</Text>
          <Text style={styles.previewText}>
            Aquí conviene un flujo nativo con zoom, selección por toque, filtros por manzana y FAB para crear nuevas unidades.
          </Text>
        </View>
      </Panel>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  planWrap: {
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#11131A",
    borderWidth: 1,
    borderColor: colors.line,
  },
  planImage: {
    width: "100%",
    height: 240,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  previewCard: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: colors.surfaceAlt,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  previewText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    color: colors.textSoft,
  },
});
