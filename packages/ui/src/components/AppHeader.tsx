import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { customerDarkTheme, customerTheme, spacing, tint, type } from "../theme";
import { BrandMark } from "./BrandMark";

/**
 * The top of every customer screen: who you are, whose app this is, and the
 * way out.
 *
 * WHY THE WORDMARK IS CENTRED AND LARGE. The previous header put a 15px
 * mark inside a utility row between an address and two icons, and the
 * review's first note was the simplest one on the board: "הלוגו קטן מדי —
 * לא עומד בהיררכיה". A wordmark that has to compete with an address chip
 * for attention is not a wordmark, it is a label. Centred, at section size,
 * it becomes the fixed point the rest of the screen is arranged around —
 * which matters more here than in most products, because PRO NOW is asking
 * strangers to let a person into their house. A brand that looks
 * provisional cannot make that request.
 *
 * WHY THE GREETING CARRIES A FACE AND THE MATCH SCREEN DOES NOT. This is
 * the customer's own photograph, which they provided. §8 forbids inventing
 * a face for a PROFESSIONAL — the person who has not been assigned yet, or
 * whose photo we have not verified. It says nothing against showing someone
 * their own avatar, and the two are not the same promise: one is
 * identification, the other is evidence.
 */

export interface AppHeaderProps {
  /** "שלום, דני" — assembled by the app, which owns the locale. */
  greetingHe?: string | null;
  /** The customer's own avatar, if they have set one. */
  avatarUri?: string | null;
  tone?: "light" | "dark";
  onMenu?: () => void;
  onAccount?: () => void;
  /** Back, on screens that have somewhere to go back to. */
  onBack?: () => void;
  /** The prototype's side switch, and anything else the host must hang. */
  trailing?: React.ReactNode;
  width: number;
}

export function AppHeader({
  greetingHe,
  avatarUri,
  tone = "dark",
  onMenu,
  onAccount,
  onBack,
  trailing,
  width,
}: AppHeaderProps) {
  const colors = tone === "dark" ? customerDarkTheme.colors : customerTheme.colors;
  const wash = tone === "dark" ? tint.neutralDark(0.08) : tint.neutralLight(0.05);
  /*
   * The ring around the portrait, on whichever bar this header is. A
   * fixed dark hairline is invisible on the night bar and the circle
   * goes back to reading as a stain — which is the defect this ring was
   * added to fix, reintroduced on half the screens.
   */
  const ring = tone === "dark" ? "rgba(247,243,250,0.22)" : "rgba(23,18,31,0.12)";

  return (
    <View style={[styles.header, { width }]}>
      {/* RIGHT in an RTL screen: where a Hebrew reader starts. */}
      <View style={styles.side}>
        <Pressable
          onPress={onMenu}
          disabled={!onMenu}
          accessibilityRole="button"
          accessibilityLabel="תפריט"
          accessibilityState={{ disabled: !onMenu }}
          style={[styles.iconBtn, !onMenu && { opacity: 0.45 }]}
        >
          <MenuGlyph color={colors.textPrimary} />
        </Pressable>
        {trailing}
      </View>

      <BrandMark size="lead" tone={tone} />

      <View style={[styles.side, styles.sideEnd]}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="חזרה"
            style={styles.iconBtn}
          >
            {/* Back points the way the reader came from: to the right. */}
            <Text style={[styles.back, { color: colors.textPrimary }]}>›</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={onAccount}
            disabled={!onAccount}
            accessibilityRole="button"
            accessibilityLabel={greetingHe ? `${greetingHe} — החשבון שלי` : "החשבון שלי"}
            accessibilityState={{ disabled: !onAccount }}
            style={[styles.me, !onAccount && { opacity: 0.45 }]}
          >
            <View style={[styles.avatar, { backgroundColor: wash, borderColor: ring }]}>
              {avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  style={styles.avatarImg}
                  /*
                   * COVER, SAID OUT LOUD.
                   *
                   * The portraits are 436×512 — a head and shoulders, not
                   * a square — and the default fit on one platform is not
                   * the default on another. Named here so the face is
                   * centred in the circle everywhere rather than on
                   * whichever platform was looked at last.
                   */
                  resizeMode="cover"
                  accessible={false}
                />
              ) : (
                <PersonGlyph color={colors.textSecondary} />
              )}
            </View>
            {greetingHe ? (
              <Text style={[styles.greeting, { color: colors.textSecondary }]} numberOfLines={1}>
                {greetingHe}
              </Text>
            ) : null}
          </Pressable>
        )}
      </View>
    </View>
  );
}

function MenuGlyph({ color }: { color: string }) {
  return (
    <View style={styles.menu}>
      <View style={[styles.menuBar, { backgroundColor: color }]} />
      <View style={[styles.menuBar, { backgroundColor: color, width: 14 }]} />
      <View style={[styles.menuBar, { backgroundColor: color }]} />
    </View>
  );
}

function PersonGlyph({ color }: { color: string }) {
  return (
    <View style={styles.person}>
      <View style={[styles.personHead, { borderColor: color }]} />
      <View style={[styles.personBody, { borderColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  /*
   * Equal, flexible sides. The wordmark is centred by the layout rather
   * than by counting pixels, so it stays centred when one side gains a
   * greeting and the other gains the prototype's side switch — which is
   * exactly what went wrong the first time: the mark drifted right and
   * stopped reading as the fixed point of the screen.
   */
  side: { flex: 1, flexDirection: "row-reverse", alignItems: "center", gap: spacing.xs },
  sideEnd: { justifyContent: "flex-end" },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  back: { ...type.section, fontWeight: "400" },

  me: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm, minHeight: 44 },
  /*
   * 44, NOT 34.
   *
   * Amit, on the gallery: *"האווטאר ככ קטן שאני לא מצליח לראות אותו
   * אפילו."* He is right, and 34 was chosen as chrome rather than as a
   * face: at that size a drawn portrait is a coloured smudge, and the
   * one thing this circle is for is the customer recognising THEMSELVES
   * in the app.
   *
   * 44 costs the header nothing — the row beside it is already 44 for
   * the touch target, so the bar does not grow by a pixel — and it is
   * the same number the rest of the product uses for "a thing a finger
   * is meant to find".
   *
   * The ring is the other half. A circular photograph with no edge on a
   * near-white bar reads as a stain; a hairline says it is a portrait.
   */
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
  },
  avatarImg: { width: 44, height: 44, borderRadius: 22 },
  greeting: { ...type.meta, writingDirection: "rtl", maxWidth: 70, flexShrink: 1 },

  menu: { width: 22, gap: 4, alignItems: "flex-end" },
  menuBar: { width: 20, height: 2, borderRadius: 1 },
  person: { width: 20, height: 20, alignItems: "center", justifyContent: "flex-end" },
  personHead: { width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, marginBottom: 1 },
  personBody: {
    width: 15,
    height: 8,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: 1.5,
    borderBottomWidth: 0,
  },
});
