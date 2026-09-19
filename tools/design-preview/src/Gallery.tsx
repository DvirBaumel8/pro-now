import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";

import {
  MatchCard,
  MatchCardSkeleton,
  OfferCard,
  OfferCardSkeleton,
  customerTheme,
  proTheme,
  spacing,
  typography,
} from "@pro-now/ui";

import {
  FROZEN_NOW_MS,
  matchFixture,
  matchNewProFixture,
  matchPendingEtaFixture,
  offerEstimateFixture,
  offerFixture,
  offerUnknownPayoutFixture,
} from "./fixtures";

/**
 * Developer-only gallery. Every card state that has to work in production is
 * rendered here side by side, so a reviewer can see the honest-absence cases
 * (no rating, no ETA, unknown payout, expired offer) next to the happy path
 * rather than only the happy path.
 */

function Section({
  title,
  subtitle,
  dark = false,
  children,
}: {
  title: string;
  subtitle: string;
  dark?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.section, { backgroundColor: dark ? proTheme.colors.bg : "transparent" }]}>
      <Text style={[styles.sectionTitle, dark && { color: proTheme.colors.textPrimary }]}>{title}</Text>
      <Text style={[styles.sectionSubtitle, dark && { color: proTheme.colors.textSecondary }]}>{subtitle}</Text>
      <View style={styles.row}>{children}</View>
    </View>
  );
}

function Phone({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <View style={[styles.phone, { backgroundColor: dark ? proTheme.colors.bg : customerTheme.colors.bg }]}>
      {children}
    </View>
  );
}

function Caption({ children, dark = false }: { children: string; dark?: boolean }) {
  return (
    <Text style={[styles.caption, dark && { color: proTheme.colors.textSecondary }]}>{children}</Text>
  );
}

export function Gallery() {
  const noop = () => undefined;

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      <View style={styles.header}>
        <Text style={styles.h1}>PRO NOW — גלריית רכיבים</Text>
        <Text style={styles.headerNote}>
          תצוגת מפתחים בלבד. הנתונים כאן הם דוגמאות קבועות לבדיקת עיצוב, ולא אספקה אמיתית.
        </Text>
      </View>

      <Section
        title="כרטיס התאמה — צד הלקוח"
        subtitle="C09 · נמצא בעל מקצוע. זמן ההגעה דומיננטי, התגים עובדתיים בלבד, המחיר מוסבר לפי מודל התמחור."
      >
        <View>
          <Phone>
            <MatchCard match={matchFixture} onConfirm={noop} onRequestAnother={noop} />
          </Phone>
          <Caption>מצב מלא · דמי ביקור · ETA מבוסס מסלול</Caption>
        </View>

        <View>
          <Phone>
            <MatchCard match={matchNewProFixture} onConfirm={noop} onRequestAnother={noop} />
          </Phone>
          <Caption>בעל מקצוע חדש · ללא דירוג · ETA משוער (לא מבוסס מסלול)</Caption>
        </View>

        <View>
          <Phone>
            <MatchCard match={matchPendingEtaFixture} onConfirm={noop} onRequestAnother={noop} />
          </Phone>
          <Caption>ETA בחישוב · תמחור שעתי · ביקורת מאומתת אחת</Caption>
        </View>

        <View>
          <Phone>
            <MatchCardSkeleton />
          </Phone>
          <Caption>מצב טעינה</Caption>
        </View>
      </Section>

      <Section
        dark
        title="כרטיס הצעה — צד בעל המקצוע"
        subtitle="P · הצעה נכנסת. ספירה לאחור מול מועד שרת, תשלום צפוי לפני קבלה, אזור מקורב בלבד לפני שיוך."
      >
        <View>
          <Phone dark>
            <OfferCard offer={offerFixture} onAccept={noop} onSkip={noop} nowMs={FROZEN_NOW_MS} />
          </Phone>
          <Caption dark>תשלום ידוע · 30 שניות · דחיפות רגועה</Caption>
        </View>

        <View>
          <Phone dark>
            <OfferCard
              offer={offerEstimateFixture}
              onAccept={noop}
              onSkip={noop}
              nowMs={FROZEN_NOW_MS + 20000}
            />
          </Phone>
          <Caption dark>תשלום משוער · נותרו 10 שניות · דחיפות אזהרה</Caption>
        </View>

        <View>
          <Phone dark>
            <OfferCard
              offer={offerUnknownPayoutFixture}
              onAccept={noop}
              onSkip={noop}
              nowMs={FROZEN_NOW_MS + 26000}
            />
          </Phone>
          <Caption dark>תשלום לא ידוע מראש · ETA משוער · דחיפות קריטית</Caption>
        </View>

        <View>
          <Phone dark>
            <OfferCard offer={offerFixture} onAccept={noop} onSkip={noop} nowMs={FROZEN_NOW_MS + 40000} />
          </Phone>
          <Caption dark>ההצעה הסתיימה · הפעולות מושבתות</Caption>
        </View>

        <View>
          <Phone dark>
            <OfferCardSkeleton />
          </Phone>
          <Caption dark>מצב טעינה</Caption>
        </View>
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F2F1EC" },
  pageContent: { paddingBottom: spacing.xxl * 2 },
  header: { padding: spacing.xxl, alignItems: "flex-end" },
  h1: { fontSize: 30, fontWeight: "700", color: "#14151A", textAlign: "right", writingDirection: "rtl" },
  headerNote: {
    ...typography.body,
    color: "#5B5F57",
    textAlign: "right", writingDirection: "rtl",
    marginTop: spacing.sm,
    maxWidth: 680,
  },

  section: { paddingVertical: spacing.xxl, paddingHorizontal: spacing.xxl },
  sectionTitle: { fontSize: 22, fontWeight: "700", color: "#14151A", textAlign: "right", writingDirection: "rtl" },
  sectionSubtitle: {
    ...typography.caption,
    color: "#5B5F57",
    textAlign: "right", writingDirection: "rtl",
    marginTop: spacing.xs,
    maxWidth: 760,
  },

  row: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: spacing.xxl,
    marginTop: spacing.xl,
    alignItems: "flex-start",
  },

  phone: {
    width: 390,
    padding: spacing.lg,
    borderRadius: 32,
  },
  caption: {
    ...typography.caption,
    color: "#5B5F57",
    textAlign: "center",
    marginTop: spacing.sm,
    width: 390,
  },
});
