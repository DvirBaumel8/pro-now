import { StyleSheet, Text, View } from "react-native";
import { PrimaryAction, customerDarkTheme, spacing, type as t } from "@pro-now/ui";

/**
 * The loading and error states every data screen has (CLAUDE.md §6), in the
 * demo's dark customer palette and its own wording ("רגע…"). They are driven
 * by the query's status, never by hand-set flags.
 */
export function LoadingScreen() {
  return (
    <View style={styles.screen} accessibilityRole="progressbar" accessibilityLabel="טוען">
      <Text style={styles.soft}>רגע…</Text>
    </View>
  );
}

export function ErrorScreen({ offline, onRetry }: { offline: boolean; onRetry: () => void }) {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{offline ? "אין חיבור לאינטרנט" : "משהו לא נטען"}</Text>
      <Text style={styles.soft}>
        {offline ? "כשהחיבור יחזור, נמשיך מאיפה שעצרנו." : "זה לא אתם, זה אנחנו. אפשר לנסות שוב."}
      </Text>
      <View style={{ alignSelf: "stretch", marginTop: spacing.xl }}>
        <PrimaryAction labelHe="לנסות שוב" onPress={onRetry} />
      </View>
    </View>
  );
}

const colors = customerDarkTheme.colors;
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  title: { ...t.h2, color: colors.textPrimary, textAlign: "center", writingDirection: "rtl" },
  soft: { ...t.body, color: colors.textSecondary, textAlign: "center", writingDirection: "rtl", marginTop: spacing.sm },
});
