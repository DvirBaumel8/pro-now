import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  discoveryProgressHe,
  playDrawerActions,
  playDrawerStatusHe,
  type DiscoveryState,
  type PlayDrawerActionId,
} from "@pro-now/types";

import { palette, radii, spacing, type } from "../../theme";

/**
 * PLAY DRAWER — the answer to "it gets stuck and there is nothing to do".
 *
 * ---------------------------------------------------------------------
 * A DEFECT, NOT A MISSING FEATURE
 * ---------------------------------------------------------------------
 * Amit played the first waiting game and found its real problem before its
 * aesthetic one: *"שאתה מסיים זה נתקע על המסך ואין מה לעשות, אין אפשרות
 * לחזור לתפריט."* Collecting the last orb left the screen with nowhere to
 * go — during the one part of the job where someone is waiting for a
 * stranger to arrive at their home.
 *
 * The fix is structural rather than a button. There is no end state,
 * because there is no state this drawer is absent from. It is always
 * mounted through the wait, it always names the one fact that matters, and
 * it always offers a way onward. A "Game Over" screen cannot appear because
 * nothing here ever finishes.
 *
 * ChatGPT: *"לא modal. לא Game Over. לא מסך סיום."*
 *
 * ---------------------------------------------------------------------
 * AND IT IS NOT A GAME MENU
 * ---------------------------------------------------------------------
 * The status line is real dispatch data or an honest absence, never a
 * countdown invented to fill the strip. Following the arrival and the job
 * details sit beside playing, at the same size, because for most people
 * those are the reason the screen is open.
 */
export interface PlayDrawerProps {
  firstNameHe: string | null;
  etaMinutes: number | null;
  discoveries: DiscoveryState;
  hasJobDetails?: boolean;
  onAction?: (id: PlayDrawerActionId) => void;
}

export function PlayDrawer({ firstNameHe, etaMinutes, discoveries, hasJobDetails = true, onAction }: PlayDrawerProps) {
  const status = playDrawerStatusHe({ firstNameHe, etaMinutes });
  const progress = discoveryProgressHe(discoveries);
  const actions = playDrawerActions({ firstNameHe, discoveries, hasJobDetails });

  return (
    <View style={styles.drawer} pointerEvents="box-none">
      <View style={styles.handle} />

      <Text style={styles.status} numberOfLines={1}>
        {status}
      </Text>

      {/*
        * The counter appears only once someone has found something. Before
        * that "מצאת 0 מתוך 6" would be an instruction, and nobody has to
        * play — *"לא הייתי הופך את זה ל'משחק שחייבים לשחק'"*.
        */}
      {progress ? (
        <Text style={styles.progress} numberOfLines={1}>
          {progress}
        </Text>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        // The document is LTR and the content is Hebrew, so the row is
        // reversed and the scroll starts at the right-hand end.
        contentContainerStyle={styles.actions}
      >
        {actions.map((a) => (
          <Pressable
            key={a.id}
            onPress={() => onAction?.(a.id)}
            accessibilityRole="button"
            accessibilityLabel={a.labelHe}
            style={({ pressed }) => [styles.chip, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.chipText} numberOfLines={1}>
              {a.labelHe}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  drawer: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderRadius: radii.xl,
    backgroundColor: "rgba(16,12,22,0.88)",
    borderTopWidth: 1,
    borderTopColor: "rgba(247,243,250,0.1)",
  },
  handle: {
    alignSelf: "center",
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(247,243,250,0.22)",
    marginBottom: spacing.sm,
  },
  status: { ...type.bodyStrong, color: palette.nightText, textAlign: "center", writingDirection: "rtl" },
  progress: {
    ...type.micro,
    color: palette.nightTextSoft,
    textAlign: "center",
    writingDirection: "rtl",
    marginTop: 2,
  },
  actions: { flexDirection: "row-reverse", gap: spacing.sm, paddingTop: spacing.sm },
  chip: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    justifyContent: "center",
    borderRadius: radii.pill,
    backgroundColor: "rgba(247,243,250,0.08)",
  },
  chipText: { ...type.meta, color: palette.nightText, writingDirection: "rtl" },
});
