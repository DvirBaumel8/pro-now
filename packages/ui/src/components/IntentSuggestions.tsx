import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { customerDarkTheme, radii, spacing, tint, type } from "../theme";
import { Mark, type MarkName } from "./marks";
import { PrimaryAction } from "./PrimaryAction";
import { Pulse } from "./LiveServiceCard";

/**
 * WHAT WE MADE OF WHAT YOU SAID.
 *
 * Appears under the capture card the moment the matcher has something, and
 * is absent before that — which is the reason the home screen carries no
 * coral until the customer has spoken. §2 reserves coral for consequence;
 * a screen where nothing can yet be done has no consequence to colour.
 *
 * THE COPY IS "נראה שזה", NOT "הבנתי". Text matching here is a
 * deterministic keyword matcher (see service-match.ts), and audio and
 * images are not interpreted at all — they are carried with the request and
 * shown to the professional. Every word on this component is chosen to
 * claim exactly that much and no more (/CLAUDE.md §3).
 *
 * THE RUNNERS-UP ARE NOT BUTTONS. One filled action, then alternatives as
 * quiet rows: an alternative styled like the primary is not an alternative,
 * it is a second question.
 */

const colors = customerDarkTheme.colors;

export interface IntentSuggestion {
  id: string;
  nameHe: string;
  mark: MarkName;
  /** Live supply line, when the server has one. */
  supplyHe?: string | null;
  supplyTone?: "live" | "warning" | "muted";
}

export interface IntentSuggestionsProps {
  /** `null` = not attempted. `[]` = attempted and nothing matched. */
  matches: IntentSuggestion[] | null;
  /** True when a recording or a photo is held but nothing matched. */
  hasMedia?: boolean;
  hasText?: boolean;
  /** A photo is being looked at right now. */
  recognising?: boolean;
  /** The sentence is being read for meaning (no keyword matched). */
  understanding?: boolean;
  /** The label of the door to the whole list, when nothing was found. */
  browseLabelHe?: string;
  /** What was seen in the photo, in one sentence — shown above the match. */
  seenHe?: string | null;
  onPick?: (serviceId: string) => void;
  onBrowse?: () => void;
  width: number;
}

export function IntentSuggestions({
  matches,
  hasMedia = false,
  hasText = false,
  recognising = false,
  understanding = false,
  seenHe = null,
  browseLabelHe = "כל השירותים ›",
  onPick,
  onBrowse,
  width,
}: IntentSuggestionsProps) {
  const best = matches && matches.length > 0 ? matches[0] : undefined;
  const alternatives = matches ? matches.slice(1, 3) : [];

  if (!best && !hasText && !hasMedia) return null;

  if (!best && (recognising || understanding)) {
    return (
      <View style={[styles.wrap, { width }]}>
        <Text style={styles.lead}>{recognising ? "מזהים מה בתמונה…" : "מבינים מה כתבתם…"}</Text>
        <Text style={styles.note}>
          {recognising ? "שנייה — מסתכלים על הצילום ומתאימים את השירות." : "שנייה — מתאימים את השירות לתיאור שלכם."}
        </Text>
      </View>
    );
  }

  if (!best) {
    return (
      <View style={[styles.wrap, { width }]}>
        <Text style={styles.lead}>
          {hasText ? "עוד לא בטוחים איזה שירות מתאים." : "יש לנו את מה שצילמתם והקלטתם."}
        </Text>
        <Text style={styles.note}>
          {hasMedia
            ? "ההקלטה והתמונות יישלחו יחד עם הקריאה, והמקצוען יראה אותן לפני שהוא יוצא. בחרו את השירות מהרשימה."
            : "הוסיפו מילה על מה שקרה (למשל ״נוזל מים מהתקרה״, ״החתול לא אוכל״) — או בחרו מהרשימה."}
        </Text>
        {onBrowse ? (
          <Pressable onPress={onBrowse} accessibilityRole="button" style={styles.browse}>
            <Text style={styles.browseText}>{browseLabelHe}</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { width }]}>
      {seenHe ? <Text style={styles.note}>בתמונה: {seenHe}</Text> : null}
      <Text style={styles.lead}>נראה שזה:</Text>

      <PrimaryAction
        labelHe={`המשך · ${best.nameHe}`}
        subLabelHe={best.supplyHe ?? null}
        onPress={() => onPick?.(best.id)}
        accessibilityLabelHe={`המשך עם ${best.nameHe}`}
      />

      {alternatives.length > 0 ? <Text style={styles.alt}>או אולי התכוונתם ל:</Text> : null}

      {alternatives.map((m) => (
        <Pressable
          key={m.id}
          onPress={() => onPick?.(m.id)}
          accessibilityRole="button"
          accessibilityLabel={`המשך עם ${m.nameHe}`}
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]}
        >
          <View style={styles.markWrap}>
            <Mark name={m.mark} size={19} color={colors.textPrimary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>
              {m.nameHe}
            </Text>
            {m.supplyHe ? (
              <View style={styles.supply}>
                {m.supplyTone === "live" ? <Pulse color={colors.action} size={5} /> : null}
                <Text
                  style={[
                    styles.supplyText,
                    {
                      color:
                        m.supplyTone === "live"
                          ? colors.actionText
                          : m.supplyTone === "warning"
                            ? colors.statusWarningText
                            : colors.textSecondary,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {m.supplyHe}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.go}>‹</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  lead: { ...type.metaStrong, color: colors.textSecondary, textAlign: "right", writingDirection: "rtl" },
  note: { ...type.meta, color: colors.textSecondary, textAlign: "right", writingDirection: "rtl" },
  alt: { ...type.meta, color: colors.textSecondary, textAlign: "right", writingDirection: "rtl", marginTop: spacing.xs },
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 58,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
  },
  markWrap: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: tint.neutralDark(0.07),
    alignItems: "center",
    justifyContent: "center",
  },
  name: { ...type.body, color: colors.textPrimary, textAlign: "right", writingDirection: "rtl" },
  supply: { flexDirection: "row-reverse", alignItems: "center", gap: 5, marginTop: 1 },
  supplyText: { ...type.micro, writingDirection: "rtl" },
  go: { ...type.section, fontWeight: "400", color: colors.textSecondary },
  browse: { minHeight: 44, justifyContent: "center", alignItems: "flex-end" },
  browseText: { ...type.metaStrong, color: colors.actionText },
});
