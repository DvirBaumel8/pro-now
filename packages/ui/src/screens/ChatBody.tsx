import React, { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { BackButton } from "../components/BackButton";
import { customerTheme, elevation, proTheme, radii, scale, spacing, tabular, tint, type } from "../theme";
import { ClockMark, ShieldCheckMark } from "../components/marks";
import { Persona } from "../components/Persona";

/**
 * C15 / P21 — the conversation between customer and professional.
 *
 * One component serves both sides, because the conversation is the same
 * object seen from two ends, and two implementations of one thread is how
 * the two sides quietly start showing different histories.
 *
 * THE MASKING IS THE FEATURE, NOT A FOOTNOTE. Neither party ever holds the
 * other's personal number (/docs/12-PRIVACY.md): calls route through a
 * relay, messages through the platform. That protects a professional from
 * being called at midnight about a job that closed in March, and a customer
 * from a number that outlives the visit — so the screen states it plainly
 * at the top instead of burying it in settings.
 *
 * THE THREAD IS BOUND TO A JOB, AND DIES WITH IT. There is no persistent
 * inbox, no way to open a chat with someone you are not currently working
 * with, and no way to reach a professional you saw once. A marketplace
 * where anyone can message anyone becomes a directory with a chat app
 * attached, which is precisely what ONLINE-FIRST is not (/CLAUDE.md §3).
 * When the job closes the thread becomes read-only, and the screen says so.
 */

export type ChatSide = "customer" | "pro";

export interface ChatMessage {
  id: string;
  /** Who wrote it — not a user id, because the UI only needs the side. */
  from: ChatSide | "system";
  textHe: string;
  /** "14:22" */
  atHe: string;
  /** Set on the last message the other side has seen. */
  seen?: boolean;
}

export interface ChatBodyProps {
  side: ChatSide;
  /** The person on the OTHER end. */
  counterpartNameHe: string;
  counterpartSeed: string;
  /** Job context, so nobody has to ask "which job is this?". */
  jobTitleHe: string;
  /** Null once the job is closed; the composer then locks. */
  jobOpen: boolean;
  messages: ChatMessage[];
  /** Quick replies. The most-sent sentences, so nobody types while driving. */
  quickRepliesHe?: string[];
  onSend?: (textHe: string) => void;
  onCall?: () => void;
  onBack?: () => void;
  width?: number;
  height?: number;
}

export function ChatBody({
  side,
  counterpartNameHe,
  counterpartSeed,
  jobTitleHe,
  jobOpen,
  messages,
  quickRepliesHe = [],
  onSend,
  onCall,
  onBack,
  width = 390,
  height = 780,
}: ChatBodyProps) {
  const colors = side === "pro" ? proTheme.colors : customerTheme.colors;
  const dark = side === "pro";
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<ScrollView>(null);

  // A chat that opens at the top of the history is a chat nobody can use.
  useEffect(() => {
    const id = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 50);
    return () => clearTimeout(id);
  }, [messages.length]);

  const send = (text: string) => {
    const t = text.trim();
    if (!t || !jobOpen) return;
    onSend?.(t);
    setDraft("");
  };

  const s = makeStyles();

  return (
    <View style={[s.screen, { width, height, backgroundColor: colors.bg }]}>
      {/* ---------------- Who, and which job ---------------- */}
      <View style={[s.head, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <BackButton onPress={onBack} tone={"light"} placement="inline" />

        <View style={s.headMain}>
          <Persona seed={counterpartSeed} size={40} ring={colors.trust} />
          <View style={s.headText}>
            <Text style={[s.name, { color: colors.textPrimary }]} numberOfLines={1}>
              {counterpartNameHe}
            </Text>
            <Text style={[s.job, { color: colors.textSecondary }]} numberOfLines={1}>
              {jobTitleHe}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={onCall}
          disabled={!jobOpen}
          accessibilityRole="button"
          accessibilityLabel="שיחה"
          style={[s.callBtn, { backgroundColor: tint.trust(0.16) }, !jobOpen && { opacity: 0.4 }]}
        >
          <Text style={[s.callGlyph, { color: colors.trust }]}>✆</Text>
        </Pressable>
      </View>

      <View style={[s.maskBar, { backgroundColor: tint.trust(dark ? 0.1 : 0.08) }]}>
        <ShieldCheckMark size={13} color={colors.trust} />
        <Text style={[s.maskText, { color: colors.textSecondary }]} numberOfLines={2}>
          השיחה וההודעות עוברות דרך PRO NOW. המספר הפרטי של אף צד לא נחשף.
        </Text>
      </View>

      {/* ---------------- The thread ---------------- */}
      <ScrollView ref={scrollRef} style={s.thread} contentContainerStyle={s.threadContent}>
        {messages.map((m) => {
          if (m.from === "system") {
            return (
              <View key={m.id} style={s.systemWrap}>
                <Text style={[s.systemText, { color: colors.textSecondary }]}>{m.textHe}</Text>
              </View>
            );
          }
          const mine = m.from === side;
          return (
            <View key={m.id} style={[s.row, mine ? s.rowMine : s.rowTheirs]}>
              <View
                style={[
                  s.bubble,
                  mine
                    ? { backgroundColor: colors.action, borderBottomLeftRadius: 6 }
                    : { backgroundColor: colors.surface, borderBottomRightRadius: 6, ...elevation(1, dark) },
                ]}
              >
                <Text style={[s.msg, { color: mine ? "#FFFFFF" : colors.textPrimary }]}>{m.textHe}</Text>
                <View style={s.metaRow}>
                  <Text style={[s.time, { color: mine ? "rgba(255,255,255,0.75)" : colors.textSecondary }]}>
                    {m.atHe}
                  </Text>
                  {mine && m.seen ? (
                    <Text style={[s.time, { color: "rgba(255,255,255,0.75)" }]}>· נקרא</Text>
                  ) : null}
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* ---------------- Composer ---------------- */}
      {jobOpen ? (
        <View style={[s.composerWrap, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          {quickRepliesHe.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.quickRow}>
              {quickRepliesHe.map((q) => (
                <Pressable
                  key={q}
                  onPress={() => send(q)}
                  accessibilityRole="button"
                  style={[s.quick, { backgroundColor: colors.surfaceElevated }]}
                >
                  <Text style={[s.quickText, { color: colors.textPrimary }]} numberOfLines={1}>
                    {q}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}

          <View style={s.composer}>
            <Pressable
              onPress={() => send(draft)}
              disabled={!draft.trim()}
              accessibilityRole="button"
              accessibilityLabel="שליחה"
              style={[s.sendBtn, { backgroundColor: colors.action }, !draft.trim() && { opacity: 0.35 }]}
            >
              <Text style={s.sendGlyph}>↑</Text>
            </Pressable>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={() => send(draft)}
              placeholder="הודעה"
              accessibilityLabel="כתיבת הודעה"
              placeholderTextColor={colors.textSecondary}
              style={[
                s.input,
                { backgroundColor: colors.surfaceElevated, color: colors.textPrimary, borderColor: colors.border },
              ]}
              textAlign="right"
              returnKeyType="send"
            />
          </View>
        </View>
      ) : (
        <View style={[s.closedWrap, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <ClockMark size={14} color={colors.textSecondary} />
          <Text style={[s.closedText, { color: colors.textSecondary }]}>
            העבודה נסגרה, אז השיחה הזו לקריאה בלבד. לכל דבר נוסף — פנייה לתמיכה.
          </Text>
        </View>
      )}
    </View>
  );
}

/**
 * Styles that do not depend on the side; per-side colours are applied
 * inline, because a chat on a dark surface and a chat on a light one differ
 * in colour and nothing else.
 */
function makeStyles() {
  return StyleSheet.create({
    screen: { overflow: "hidden", borderRadius: radii.xl },

    head: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xl,
      paddingBottom: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth * 2,
    },
    headMain: { flex: 1, flexDirection: "row-reverse", alignItems: "center", gap: spacing.md },
    headText: { flex: 1, alignItems: "flex-end" },
    name: { ...type.bodyStrong, writingDirection: "rtl" },
    job: { ...type.caption, writingDirection: "rtl" },
    callBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
    callGlyph: { fontSize: scale.body },

    maskBar: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    maskText: { ...type.caption, flex: 1, fontSize: scale.micro, lineHeight: 15, textAlign: "right", writingDirection: "rtl" },

    thread: { flex: 1 },
    threadContent: { padding: spacing.lg, gap: spacing.sm },

    row: { flexDirection: "row" },
    /*
     * In a Hebrew RTL conversation the sender's own messages sit on the
     * RIGHT and the other side's on the left — the mirror of the LTR
     * convention. The screens here lay out with `row` rather than RN's
     * forceRTL, so the sides are chosen explicitly instead of inherited,
     * and the tail corner follows the side it is on.
     */
    rowMine: { justifyContent: "flex-end" },
    rowTheirs: { justifyContent: "flex-start" },
    bubble: { maxWidth: "82%", borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
    msg: { ...type.body, fontSize: scale.meta, textAlign: "right", writingDirection: "rtl", lineHeight: 21 },
    metaRow: { flexDirection: "row-reverse", alignItems: "center", gap: 4, marginTop: 2 },
    time: { ...type.caption, ...tabular, fontSize: scale.micro },

    systemWrap: { alignItems: "center", paddingVertical: spacing.sm },
    systemText: { ...type.caption, fontSize: scale.micro, textAlign: "center", writingDirection: "rtl" },

    composerWrap: { borderTopWidth: StyleSheet.hairlineWidth * 2, paddingBottom: spacing.lg },
    quickRow: { flexDirection: "row-reverse", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
    quick: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radii.pill },
    quickText: { ...type.caption, writingDirection: "rtl" },

    composer: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xs,
    },
    input: {
      flex: 1,
      minHeight: 46,
      borderRadius: radii.pill,
      borderWidth: StyleSheet.hairlineWidth * 2,
      paddingHorizontal: spacing.lg,
      ...type.body,
      fontSize: scale.meta,
      writingDirection: "rtl",
    },
    sendBtn: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
    sendGlyph: { color: "#FFFFFF", fontSize: scale.body, fontWeight: "700" },

    closedWrap: {
      flexDirection: "row-reverse",
      alignItems: "flex-start",
      gap: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth * 2,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
    },
    closedText: { ...type.caption, flex: 1, textAlign: "right", writingDirection: "rtl", lineHeight: 18 },
  });
}
