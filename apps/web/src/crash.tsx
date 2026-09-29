import { Component, type ErrorInfo, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { PrimaryAction, customerDarkTheme, spacing, type as t } from "@pro-now/ui";
import { reportError } from "./observability";

/**
 * The last line under every screen (docs/23-OBSERVABILITY.md): a render
 * crash is reported, and the person gets a way back instead of a blank
 * page. The short code is the start of the Sentry event id, so a friend
 * who sends it lets us find the exact event.
 */
export class CrashBoundary extends Component<{ children: ReactNode }, { crashed: boolean; code?: string }> {
  state: { crashed: boolean; code?: string } = { crashed: false };

  static getDerivedStateFromError() {
    return { crashed: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    const eventId = reportError(error, "render");
    this.setState({ code: eventId?.slice(0, 8) });
  }

  render() {
    return this.state.crashed ? <CrashScreen code={this.state.code} /> : this.props.children;
  }
}

export function CrashScreen({ code }: { code?: string }) {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>משהו השתבש</Text>
      <Text style={styles.soft}>קיבלנו דיווח על התקלה ואנחנו כבר בודקים. אפשר לטעון מחדש ולהמשיך.</Text>
      {code ? <Text style={styles.code}>קוד תקלה: {code}</Text> : null}
      <View style={{ alignSelf: "stretch", marginTop: spacing.xl }}>
        <PrimaryAction labelHe="לטעון מחדש" onPress={() => window.location.assign("/")} />
      </View>
    </View>
  );
}

const colors = customerDarkTheme.colors;
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    minHeight: "100%",
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  title: { ...t.h2, color: colors.textPrimary, textAlign: "center", writingDirection: "rtl" },
  soft: { ...t.body, color: colors.textSecondary, textAlign: "center", writingDirection: "rtl", marginTop: spacing.sm },
  code: { ...t.body, color: colors.textSecondary, textAlign: "center", marginTop: spacing.md, fontFamily: "monospace" },
});
