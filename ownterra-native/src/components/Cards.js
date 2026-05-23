import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../theme/colors";

export function HighlightCard({ eyebrow, title, subtitle }) {
  return (
    <LinearGradient colors={[colors.navy, "#10231A"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
      <Text style={styles.heroEyebrow}>{eyebrow}</Text>
      <Text style={styles.heroTitle}>{title}</Text>
      <Text style={styles.heroSubtitle}>{subtitle}</Text>
    </LinearGradient>
  );
}

export function StatCard({ label, value, tone = "default" }) {
  const toneStyle = tone === "danger" ? styles.danger : tone === "success" ? styles.success : styles.defaultTone;
  return (
    <View style={[styles.statCard, toneStyle]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function Panel({ title, action, children }) {
  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>{title}</Text>
        {action ? <Text style={styles.panelAction}>{action}</Text> : null}
      </View>
      {children}
    </View>
  );
}

export function ListRow({ title, subtitle, badge, tone = "neutral" }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      {badge ? <View style={[styles.badge, tone === "danger" ? styles.badgeDanger : tone === "success" ? styles.badgeSuccess : styles.badgeNeutral]}><Text style={[styles.badgeText, tone === "danger" ? styles.badgeTextDanger : tone === "success" ? styles.badgeTextSuccess : null]}>{badge}</Text></View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
  },
  heroEyebrow: {
    color: "#D6C3A6",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2.4,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: colors.white,
    fontSize: 28,
    lineHeight: 30,
    fontWeight: "700",
    marginTop: 12,
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 10,
  },
  statCard: {
    flex: 1,
    minHeight: 108,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  defaultTone: {},
  danger: {
    backgroundColor: colors.redSoft,
    borderColor: "#F0C5C0",
  },
  success: {
    backgroundColor: colors.forestSoft,
    borderColor: "#C2DDCF",
  },
  statValue: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: "700",
    color: colors.text,
  },
  statLabel: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 16,
    textTransform: "uppercase",
    letterSpacing: 1.4,
    color: colors.muted,
    fontWeight: "800",
  },
  panel: {
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    marginBottom: 16,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  panelTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.textSoft,
    letterSpacing: 1.8,
    textTransform: "uppercase",
  },
  panelAction: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.forest,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EFE8DE",
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  rowSubtitle: {
    fontSize: 13,
    color: colors.textSoft,
    marginTop: 3,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeNeutral: {
    backgroundColor: colors.surfaceAlt,
  },
  badgeDanger: {
    backgroundColor: colors.redSoft,
  },
  badgeSuccess: {
    backgroundColor: colors.forestSoft,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.textSoft,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  badgeTextDanger: {
    color: colors.red,
  },
  badgeTextSuccess: {
    color: colors.forestDark,
  },
});
