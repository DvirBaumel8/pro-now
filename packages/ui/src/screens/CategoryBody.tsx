import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { districtFor, type CustomerCategory } from "@pro-now/types";

import { customerDarkTheme, depth, palette, radii, spacing, tint, type } from "../theme";
import { BackButton, BACK_BUTTON_CLEARANCE } from "../components/BackButton";
import { Scrim } from "../components/Scrim";
import { Pulse } from "../components/LiveServiceCard";
import { WorldBackdrop } from "../components/livingmap/WorldBackdrop";
import { type WorldAssetSources } from "../components/livingmap/AssetSlot";

/**
 * A CATEGORY, AS A PLACE AND A SHORT QUESTION.
 *
 * ---------------------------------------------------------------------
 * THE BUG THIS FIXES
 * ---------------------------------------------------------------------
 * Amit: *"למה אני לוחץ על מסך הלקוח על בית ומכניס אותי ישר לאינסטלטור?"*
 *
 * Because the prototype took a shortcut I should never have shipped: a
 * category opened the FIRST service behind it. "לבית" covers burst pipes,
 * air conditioning, installations and odd jobs, and tapping it announced
 * that the customer wanted a blocked drain. That is the product deciding
 * what somebody needs before they have said a word — the exact failure
 * Amit has rejected at every stage.
 *
 * ---------------------------------------------------------------------
 * AND WHY THIS IS NOT THE CATALOGUE PAGE EITHER
 * ---------------------------------------------------------------------
 * The other way to be wrong is a list of thirty services, which he also
 * rejected. So this is what was actually agreed: tapping a category takes
 * the customer INTO that part of the world, and then asks the short
 * question needed to know what they need.
 *
 * The world is behind, focused on that trade's own street. In front is one
 * question and the handful of things this category actually covers —
 * short, because it is one category and not the whole catalogue, and with
 * live availability shown only where the server has actually said
 * something.
 */
const colors = customerDarkTheme.colors;

export interface CategoryServiceItem {
  id: string;
  nameHe: string;
  descriptionHe?: string | null;
  /**
   * How many professionals are free for this service right now.
   *
   * Null means the server has not said — which is rendered as silence, not
   * as zero. A grey "0 פנויים" on a service that simply was not in the
   * snapshot is a lie that looks like a fact.
   */
  availableNowCount?: number | null;
}

export interface CategoryBodyProps {
  /** Our world behind the trade, when the host can show it. Left out, the painted plate. */
  backdrop?: React.ReactNode;
  category: CustomerCategory;
  services: CategoryServiceItem[];
  worldSources?: WorldAssetSources;
  animate?: boolean;
  onSelectService?: (serviceId: string) => void;
  /**
   * WHAT THE CUSTOMER TYPED, WHEN NONE OF THE ROWS IS IT.
   *
   * Amit: *"כשבוחרים בקטגוריות נפתחות אפשרויות. חסרה אפשרות הקלדה ידנית
   * בשלב זה."* He is right, and the omission was a real dead end rather
   * than a missing convenience.
   *
   * The home screen opens with a text field, so the customer is invited to
   * describe the problem in their own words — and then tapping a category
   * takes that invitation away and hands them a closed list. Anyone whose
   * problem is not one of five rows is stuck, and their only move is back.
   * A marketplace whose front door is "say what you need" cannot have a
   * second screen that says "choose from these".
   */
  onDescribe?: (textHe: string) => void;
  /**
   * This category's services are PEOPLE, not faults — see
   * `categoryAsksForPerson`. The screen then asks who rather than what,
   * because "מה צריך?" over a list of barbers is a question about a
   * problem that does not exist.
   *
   * Decided by the caller from the catalogue rather than here: the
   * screen renders, it does not classify.
   */
  asksForPerson?: boolean;
  onBack?: () => void;
  width?: number;
  height?: number;
}

export function CategoryBody({
  backdrop,
  category,
  services,
  worldSources,
  animate = true,
  onSelectService,
  onDescribe,
  asksForPerson = false,
  onBack,
  width = 390,
  height = 780,
}: CategoryBodyProps) {
  const district = districtFor(category.faceDepartment);
  const [typed, setTyped] = React.useState("");
  const canSend = typed.trim().length > 1;

  return (
    <View style={[styles.screen, { width, height }]}>
      {/* The world, standing in this trade's own street. Not the Living
          Map: no candidates, no venues, nothing that implies supply. */}
      {backdrop ?? (
        <WorldBackdrop
          width={width}
          height={height}
          sources={worldSources}
          departmentCode={category.faceDepartment}
          animate={animate}
        />
      )}
      <Scrim width={width} height={height} />

      {/* The world is the background of this screen — see `BackButton`. */}
      {onBack ? <BackButton onPress={onBack} tone="dark" onArtwork /> : null}

      <ScrollView
        style={StyleSheet.absoluteFill}
        contentContainerStyle={[styles.content, { minHeight: height, paddingTop: BACK_BUTTON_CLEARANCE }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.head}>
          <Text style={styles.trade}>{district.labelHe}</Text>
          {/*
            * ONE QUESTION, AND IT IS NOT "בחר שירות".
            *
            * The customer already said the area. What is missing is the
            * thing only they know, so the question asks for that in their
            * words rather than asking them to find themselves in our
            * taxonomy.
            */}
          <Text style={styles.question}>{asksForPerson ? "את מי צריך?" : "מה צריך?"}</Text>
        </View>

        {/*
          * ABOVE THE LIST, NOT BELOW IT.
          *
          * This box sat after every service row, at the bottom of a screen
          * that scrolls. Amit: *"שורות החיפוש תמיד צריכות להיות בלמעלה של
          * התפריטים ולא בתחתית המסך אם רוצים לספר מה הבעיה ולאתר אותה."*
          *
          * He is right, and the reason is sharper than placement. The
          * person who needs this box is by definition the person who did
          * NOT find their problem in the list — and putting it last made
          * them scroll past every row that failed them to reach it. The
          * customers least well served by our taxonomy were the ones made
          * to work hardest.
          *
          * It is also the faster path for everyone else: typing "אין חשמל
          * במטבח" and being matched beats reading nine rows to decide
          * which of them is nearest to it.
          */}
        {onDescribe ? (
          <View style={styles.other}>
            {/*
              * "משהו אחר?" was right when this sat at the bottom, after
              * the list had already had its turn. At the top it would be
              * asking somebody what else they wanted before offering them
              * anything. It leads now, which is what it does.
              */}
            <Text style={styles.otherLabel}>
              {asksForPerson ? "ספרו לנו את מי אתם מחפשים" : "ספרו לנו במילים שלכם"}
            </Text>
            <View style={styles.otherRow}>
              <TextInput
                value={typed}
                onChangeText={setTyped}
                placeholder={
                  asksForPerson
                    ? `את מי אתם מחפשים — ${district.labelHe}`
                    : `תארו במילים שלכם — ${district.labelHe}`
                }
                placeholderTextColor="rgba(247,243,250,0.45)"
                style={styles.otherInput}
                textAlign="right"
                multiline
                accessibilityLabel={
                  asksForPerson ? "תיאור חופשי של מי שצריך" : "תיאור חופשי של מה שצריך"
                }
                onSubmitEditing={() => canSend && onDescribe(typed.trim())}
                returnKeyType="send"
              />
              <Pressable
                onPress={() => canSend && onDescribe(typed.trim())}
                disabled={!canSend}
                accessibilityRole="button"
                accessibilityLabel="שליחת התיאור"
                style={({ pressed }) => [
                  styles.otherSend,
                  !canSend ? styles.otherSendOff : null,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text style={styles.otherSendText}>שליחה</Text>
              </Pressable>
            </View>
            {/* Says what happens next, because a text box with no stated
                consequence is a suggestion box. */}
            <Text style={styles.otherHint}>
              נמצא את המקצוען המתאים לפי מה שכתבתם — או בחרו מהרשימה למטה.
            </Text>
          </View>
        ) : null}


        <View style={styles.list}>
          {services.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => onSelectService?.(s.id)}
              accessibilityRole="button"
              accessibilityLabel={
                typeof s.availableNowCount === "number" && s.availableNowCount > 0
                  ? `${s.nameHe} · ${s.availableNowCount === 1 ? "פנוי אחד" : `${s.availableNowCount} פנויים`} עכשיו`
                  : s.nameHe
              }
              style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
            >
              <View style={styles.rowText}>
                <Text style={styles.name} numberOfLines={1}>
                  {s.nameHe}
                </Text>
                {s.descriptionHe ? (
                  <Text style={styles.note} numberOfLines={1}>
                    {s.descriptionHe}
                  </Text>
                ) : null}
              </View>

              {/*
                * Live supply, and ONLY where the server said something.
                * A service the snapshot did not mention shows nothing at
                * all — not a zero, which would read as "nobody is
                * available" when the truth is "we did not ask".
                */}
              {typeof s.availableNowCount === "number" && s.availableNowCount > 0 ? (
                <View style={styles.live}>
                  <Pulse color={colors.action} size={5} />
                  <Text style={styles.liveText}>{s.availableNowCount === 1 ? "פנוי אחד" : `${s.availableNowCount} פנויים`}</Text>
                </View>
              ) : null}
            </Pressable>
          ))}
        </View>

        {services.length === 0 ? (
          <Text style={styles.empty}>השירותים בקטגוריה הזו ייפתחו בקרוב.</Text>
        ) : null}

        {/*
          * THE WAY OUT OF THE LIST.
          *
          * Deliberately BELOW the rows rather than above them. Most people
          * will find what they need in five short lines and tapping is
          * faster than typing; putting a text field first would make the
          * easy case do the hard thing. But the list must not be the only
          * door, which is what it was.
          *
          * The label says "אחר" rather than "חיפוש", because this is not
          * searching the catalogue — it is the customer telling us
          * something we do not have a row for, which is information worth
          * having even when it does not match anything.
          */}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Was `marginTop`, when this block was the last thing on the screen.
  // Leading instead, it needs the space BELOW it — between itself and the
  // list it is an alternative to.
  /* On its own panel: the street art behind it showed through the box and
     the send button, and the shopkeeper stood behind "שליחה". */
  other: {
    marginBottom: spacing.xl,
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.xl,
    backgroundColor: "rgba(18,12,26,0.86)",
    borderWidth: 1,
    borderColor: "rgba(247,243,250,0.08)",
  },
  otherLabel: { ...type.captionStrong, color: colors.textSecondary, textAlign: "right", writingDirection: "rtl" },
  otherRow: { flexDirection: "row-reverse", alignItems: "flex-end", gap: spacing.sm },
  otherInput: {
    ...type.body,
    flex: 1,
    color: colors.textPrimary,
    backgroundColor: depth.panel.mid,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: "rgba(247,243,250,0.10)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 52,
    writingDirection: "rtl",
  },
  otherSend: {
    minHeight: 52,
    minWidth: 76,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.action,
    alignItems: "center",
    justifyContent: "center",
  },
  otherSendOff: { backgroundColor: "rgba(255,107,74,0.35)" },
  otherSendText: { ...type.bodyStrong, color: palette.night900 },
  otherHint: { ...type.caption, color: colors.textSecondary, textAlign: "right", writingDirection: "rtl" },
  screen: { backgroundColor: palette.night900, overflow: "hidden", borderRadius: radii.xl },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, justifyContent: "flex-end", flexGrow: 1 },

  head: { alignItems: "flex-end", marginBottom: spacing.xl },
  trade: { ...type.meta, color: palette.signal300, writingDirection: "rtl" },
  question: {
    ...type.displayXL,
    color: colors.textPrimary,
    textAlign: "right",
    writingDirection: "rtl",
    /*
     * An explicit line height, because `displayXL` carries a font size
     * without one and the default is tighter than the glyphs: the trade
     * label above it ended up printed through the question's own
     * ascenders.
     */
    lineHeight: 52,
    marginTop: spacing.sm,
    textShadowColor: "rgba(16,12,22,0.9)",
    textShadowRadius: 10,
  },

  list: { gap: spacing.sm },
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 60,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: depth.panel.mid,
    borderWidth: 1,
    borderColor: "rgba(247,243,250,0.07)",
    ...depth.litEdge(0.06),
  },
  pressed: { opacity: 0.85 },
  rowText: { flex: 1, alignItems: "flex-end" },
  name: { ...type.bodyStrong, color: colors.textPrimary, writingDirection: "rtl" },
  note: { ...type.micro, color: colors.textSecondary, writingDirection: "rtl", marginTop: 2 },

  live: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: tint.action(0.14),
  },
  liveText: { ...type.micro, color: colors.actionText, writingDirection: "rtl" },

  empty: { ...type.body, color: colors.textSecondary, textAlign: "center", writingDirection: "rtl", marginTop: spacing.xl },
});
