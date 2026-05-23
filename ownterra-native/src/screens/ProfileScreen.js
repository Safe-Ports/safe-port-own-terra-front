import { StyleSheet, Text, View } from "react-native";
import ScreenShell from "../components/ScreenShell";
import { Panel } from "../components/Cards";
import { colors } from "../theme/colors";

export default function ProfileScreen() {
  return (
    <ScreenShell eyebrow="Preview" title="Perfil" subtitle="Este proyecto existe para que compares la experiencia visual como app nativa frente al frontend web/PWA.">
      <Panel title="Estado del prototipo">
        <View style={styles.block}>
          <Text style={styles.title}>Stack</Text>
          <Text style={styles.text}>Expo + React Native + React Navigation</Text>
        </View>
        <View style={styles.block}>
          <Text style={styles.title}>Uso recomendado</Text>
          <Text style={styles.text}>Abrirlo con Expo Go desde tu celular para revisar navegación, densidad visual y jerarquía móvil.</Text>
        </View>
        <View style={styles.block}>
          <Text style={styles.title}>Siguiente paso</Text>
          <Text style={styles.text}>Si te gusta la sensación nativa, luego sí conviene decidir si portar sólo ventas/cobranza o todo el sistema.</Text>
        </View>
      </Panel>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  block: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EFE8DE",
  },
  title: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },
  text: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
});
