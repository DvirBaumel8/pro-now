import React from "react";
import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from "react-native";

import {
  CustomerHomeBody,
  JobCompleteBody,
  MatchCard,
  MatchCardSkeleton,
  OfferCard,
  OfferCardSkeleton,
  ProOnlineBody,
  ProProfileBody,
  QuoteApprovalBody,
  SearchingBody,
  ServiceDetailBody,
  TrackingBody,
  customerTheme,
  proTheme,
  radii,
  spacing,
  type as t,
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
import {
  homeRecent,
  homeServices,
  profileReviews,
  profileServices,
  profileWorkPhotos,
  proServices,
  quoteFixture,
  receiptLines,
  serviceDetailElectric,
  serviceDetailLeak,
} from "./screenFixtures";

/**
 * Developer-only gallery.
 *
 * It renders the REAL components from packages/ui — the same code the apps
 * import — so a design review here is a review of what ships, not of a
 * mockup that will drift.
 *
 * Every honest-absence state is shown next to its happy path on purpose: no
 * rating yet, no ETA yet, unknown payout, unknown supply, expired offer,
 * blocked service. Those are the states that decide whether this product
 * tells the truth, and a gallery that only shows the good case hides
 * exactly the work that matters.
 */

const PHONE_MAX = 390;
const PHONE_H = 780;

/**
 * The gallery is reviewed on a laptop and on a phone. On a narrow viewport
 * a fixed 390px frame plus page padding overflows horizontally, which makes
 * the whole page feel broken. The frame therefore shrinks to fit rather
 * than forcing a sideways scroll.
 */
function usePhoneWidth() {
  const { width } = useWindowDimensions();
  return Math.min(PHONE_MAX, Math.max(300, width - 28));
}

function Frame({
  children,
  caption,
  dark = false,
  height = PHONE_H,
}: {
  children: React.ReactNode;
  caption: string;
  dark?: boolean;
  height?: number;
}) {
  const w = usePhoneWidth();
  return (
    <View style={{ width: w }}>
      <View
        style={[
          styles.frame,
          {
            width: w,
            height,
            backgroundColor: dark ? proTheme.colors.bg : customerTheme.colors.bg,
            borderColor: dark ? "rgba(255,255,255,0.08)" : "rgba(20,21,26,0.07)",
          },
        ]}
      >
        {children}
      </View>
      <Text style={[styles.caption, { width: w }, dark && { color: "rgba(255,255,255,0.55)" }]}>{caption}</Text>
    </View>
  );
}

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

export function Gallery() {
  const noop = () => undefined;
  const PHONE_W = usePhoneWidth();

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      <View style={styles.header}>
        <Text style={styles.h1}>PRO NOW — מערכת עיצוב</Text>
        <Text style={styles.headerNote}>
          תצוגת מפתחים. הרכיבים כאן הם הקוד האמיתי מ-packages/ui, לא מוקאפ. הנתונים הם דוגמאות קבועות —
          לא אספקה אמיתית ולא תצלומים אמיתיים.
        </Text>
      </View>

      {/* =============== CUSTOMER FLOW =============== */}
      <Section
        title="מסע הלקוח"
        subtitle="מהבית ועד המעקב. שלושת המסכים שמחליטים אם מישהו מזמין בעל מקצוע או סוגר את האפליקציה."
      >
        <Frame caption="C01 · בית — קטלוג עם תצלומים, זמינות אמיתית בלבד">
          <CustomerHomeBody
            greetingHe="ערב טוב"
            addressLabelHe="רמת אביב, תל אביב"
            services={homeServices}
            recent={homeRecent}
            totalAvailableNow={7}
            width={PHONE_W}
          />
        </Frame>

        <Frame caption="C01 · אותו מסך כשאין נתוני זמינות — בלי להמציא מספר">
          <CustomerHomeBody
            greetingHe="בוקר טוב"
            addressLabelHe="הרצליה פיתוח"
            services={homeServices.map((s) => ({ ...s, availableNowCount: null }))}
            totalAvailableNow={null}
            width={PHONE_W}
          />
        </Frame>

        <Frame caption="C08 · מסך החתימה — מפה, פעימה, גיליון עולה">
          <SearchingBody
            serviceNameHe="תיקון נזילה בברז"
            elapsedSeconds={38}
            candidatesConsidered={12}
            candidatesEligible={3}
            width={PHONE_W}
            height={PHONE_H}
          />
        </Frame>

        <Frame caption="C08 · אין התאמה — מצב שחייב להיראות טוב כמו ההצלחה">
          <SearchingBody
            serviceNameHe="עבודות חשמל"
            elapsedSeconds={95}
            candidatesConsidered={8}
            candidatesEligible={0}
            exhausted
            width={PHONE_W}
            height={PHONE_H}
          />
        </Frame>

        <Frame caption="C10 · מעקב — התקדמות, ETA, יצירת קשר ממוסכת">
          <TrackingBody
            status="PRO_EN_ROUTE"
            serviceNameHe="תיקון נזילה בברז"
            professional={matchFixture.professional}
            eta={matchFixture.eta}
            priceLineHe="דמי ביקור ₪179 · הצעת מחיר תישלח לאישורך"
            width={PHONE_W}
            height={PHONE_H}
          />
        </Frame>

        <Frame caption="C10 · הגיע ומתחיל לעבוד — ETA משוער מסומן ככזה">
          <TrackingBody
            status="IN_PROGRESS"
            serviceNameHe="התקנת מזגן"
            professional={matchNewProFixture.professional}
            eta={matchNewProFixture.eta}
            priceLineHe="מחיר קבוע ₪450"
            width={PHONE_W}
            height={PHONE_H}
          />
        </Frame>
      </Section>

      {/* =============== SERVICE PAGE =============== */}
      <Section
        title="עמוד שירות"
        subtitle="C04 · מה בדיוק אני מזמין, כמה זה עולה, ומה קורה בשנייה שאלחץ. הדף שמונע את הוויכוח אחר כך."
      >
        <Frame caption="C04 · דמי ביקור + הצעת מחיר · 4 זמינים עכשיו">
          <ServiceDetailBody {...serviceDetailLeak} width={PHONE_W} height={PHONE_H} />
        </Frame>

        <Frame caption="C04 · תעריף שעתי · אפס זמינות — הכפתור כבוי, לא מבטיח">
          <ServiceDetailBody {...serviceDetailElectric} width={PHONE_W} height={PHONE_H} />
        </Frame>
      </Section>

      {/* =============== PRO PROFILE =============== */}
      <Section
        title="פרופיל בעל מקצוע"
        subtitle="C12 · שלוש עובדות נפרדות: דירוג PRO NOW, עבודות שהושלמו, ומוניטין חיצוני — לעולם לא מאוחדות לציון אחד."
      >
        <Frame caption="C12 · ותיק · דירוג, ביקורות, מוניטין Google בנפרד" height={980}>
          <ProProfileBody
            professional={matchFixture.professional}
            services={profileServices}
            reviews={profileReviews}
            workPhotoSubjects={profileWorkPhotos}
            activeSinceYear={2014}
            areaLabelHe="גוש דן"
            fromPriceMinorUnits={17900}
            width={PHONE_W}
            height={980}
          />
        </Frame>

        <Frame caption="C12 · חדש · אין דירוג, אין ביקורות, אין תצלומים — וזה נראה ככה" height={980}>
          <ProProfileBody
            professional={matchNewProFixture.professional}
            services={profileServices.slice(0, 1)}
            reviews={[]}
            workPhotoSubjects={[]}
            activeSinceYear={null}
            areaLabelHe="הרצליה והסביבה"
            fromPriceMinorUnits={null}
            width={PHONE_W}
            height={980}
          />
        </Frame>
      </Section>

      {/* =============== QUOTE =============== */}
      <Section
        title="אישור הצעת מחיר"
        subtitle="C11 · הרגע שבו מספר חדש נכנס לעסקה. כל שורה מהשרת, האישור נצמד לגרסה, והמסך לא מחשב סכומים בעצמו."
      >
        <Frame caption="C11 · ממתינה לאישור · פירוט מלא + מזהה גרסה" height={860}>
          <QuoteApprovalBody
            quote={quoteFixture}
            serviceNameHe="תיקון נזילה בברז"
            professionalDisplayName={matchFixture.professional.displayName}
            width={PHONE_W}
            height={860}
          />
        </Frame>

        <Frame caption="C11 · נשלחה גרסה חדשה יותר · אי אפשר לאשר מסך ישן" height={860}>
          <QuoteApprovalBody
            quote={quoteFixture}
            serviceNameHe="תיקון נזילה בברז"
            professionalDisplayName={matchFixture.professional.displayName}
            supersededByVersion={3}
            width={PHONE_W}
            height={860}
          />
        </Frame>

        <Frame caption="C11 · אושרה · הפעולות נעלמות, לא נכשלות" height={860}>
          <QuoteApprovalBody
            quote={{ ...quoteFixture, status: "APPROVED" }}
            serviceNameHe="תיקון נזילה בברז"
            professionalDisplayName={matchFixture.professional.displayName}
            width={PHONE_W}
            height={860}
          />
        </Frame>
      </Section>

      {/* =============== COMPLETION =============== */}
      <Section
        title="סיום, חיוב ודירוג"
        subtitle="C13 · הקבלה היא רישום מהשרת, לא סיכום. הדירוג נפתח רק כי העבודה באמת הושלמה — ואף כוכב לא מסומן מראש."
      >
        <Frame caption="C13 · טרם דורג · טופס פתוח, שליחה חסומה עד בחירת כוכבים" height={900}>
          <JobCompleteBody
            serviceNameHe="תיקון נזילה בברז"
            mark="plumbing"
            professionalDisplayName={matchFixture.professional.displayName}
            whenHe="היום, 14:20 · 55 דקות"
            receiptLines={receiptLines}
            totalChargedMinorUnits={44500}
            paymentMethodLabelHe="ויזה · 4417"
            width={PHONE_W}
            height={900}
          />
        </Frame>

        <Frame caption="C13 · כבר דורג · הטופס נסגר, הדירוג נשאר גלוי" height={900}>
          <JobCompleteBody
            serviceNameHe="תיקון נזילה בברז"
            mark="plumbing"
            professionalDisplayName={matchFixture.professional.displayName}
            whenHe="אתמול, 09:05 · 40 דקות"
            receiptLines={receiptLines}
            totalChargedMinorUnits={44500}
            paymentMethodLabelHe={null}
            existingRating={5}
            width={PHONE_W}
            height={900}
          />
        </Frame>
      </Section>

      {/* =============== MATCH CARD =============== */}
      <Section
        title="כרטיס התאמה"
        subtitle="C09 · הרגע שבו מחליטים להכניס אדם זר הביתה. זמן ההגעה דומיננטי, התגים עובדתיים בלבד."
      >
        <Frame caption="מצב מלא · דמי ביקור · ETA מבוסס מסלול" height={640}>
          <View style={styles.cardPad}>
            <MatchCard match={matchFixture} onConfirm={noop} onRequestAnother={noop} />
          </View>
        </Frame>

        <Frame caption="בעל מקצוע חדש · ללא דירוג · ETA משוער" height={640}>
          <View style={styles.cardPad}>
            <MatchCard match={matchNewProFixture} onConfirm={noop} onRequestAnother={noop} />
          </View>
        </Frame>

        <Frame caption="ETA בחישוב · ביקורת מאומתת אחת" height={640}>
          <View style={styles.cardPad}>
            <MatchCard match={matchPendingEtaFixture} onConfirm={noop} onRequestAnother={noop} />
          </View>
        </Frame>

        <Frame caption="מצב טעינה" height={640}>
          <View style={styles.cardPad}>
            <MatchCardSkeleton />
          </View>
        </Frame>
      </Section>

      {/* =============== PRO FLOW =============== */}
      <Section
        dark
        title="צד בעל המקצוע"
        subtitle="P02 · המסך התפעולי. כהה, מפה קדימה, החלטה אחת: ONLINE או לא. הנוכחות היא של השרת, לא של הלקוח."
      >
        <Frame dark caption="ONLINE · רווחי היום · שירות אחד חסום בגלל רישיון שפג">
          <ProOnlineBody
            presenceState="AVAILABLE"
            displayNameHe="דוגמה ד׳ (תצוגה)"
            todayNetMinorUnits={48200}
            todayJobCount={3}
            services={proServices}
            width={PHONE_W}
            height={PHONE_H}
          />
        </Frame>

        <Frame dark caption="לא מחובר · טרם הושלמו עבודות היום">
          <ProOnlineBody
            presenceState="OFFLINE"
            displayNameHe="דוגמה ד׳ (תצוגה)"
            todayNetMinorUnits={0}
            todayJobCount={0}
            services={proServices}
            width={PHONE_W}
            height={PHONE_H}
          />
        </Frame>

        <Frame dark caption="מצב מעבר — לא מציגים 'מחובר' לפני שהשרת אישר">
          <ProOnlineBody
            presenceState="STARTING_SHIFT"
            displayNameHe="דוגמה ד׳ (תצוגה)"
            todayNetMinorUnits={null}
            todayJobCount={0}
            services={proServices}
            width={PHONE_W}
            height={PHONE_H}
          />
        </Frame>
      </Section>

      {/* =============== OFFER CARD =============== */}
      <Section
        dark
        title="כרטיס הצעה"
        subtitle="P16 · ספירה לאחור מול מועד שרת, תשלום צפוי לפני קבלה, אזור מקורב בלבד לפני שיוך."
      >
        <Frame dark caption="תשלום ידוע · 30 שניות · דחיפות רגועה" height={620}>
          <View style={styles.cardPad}>
            <OfferCard offer={offerFixture} onAccept={noop} onSkip={noop} nowMs={FROZEN_NOW_MS} />
          </View>
        </Frame>

        <Frame dark caption="תשלום משוער · נותרו 10 שניות" height={620}>
          <View style={styles.cardPad}>
            <OfferCard offer={offerEstimateFixture} onAccept={noop} onSkip={noop} nowMs={FROZEN_NOW_MS + 20000} />
          </View>
        </Frame>

        <Frame dark caption="תשלום לא ידוע מראש · דחיפות קריטית" height={620}>
          <View style={styles.cardPad}>
            <OfferCard offer={offerUnknownPayoutFixture} onAccept={noop} onSkip={noop} nowMs={FROZEN_NOW_MS + 26000} />
          </View>
        </Frame>

        <Frame dark caption="ההצעה הסתיימה · הפעולות מושבתות" height={620}>
          <View style={styles.cardPad}>
            <OfferCard offer={offerFixture} onAccept={noop} onSkip={noop} nowMs={FROZEN_NOW_MS + 40000} />
          </View>
        </Frame>

        <Frame dark caption="מצב טעינה" height={620}>
          <View style={styles.cardPad}>
            <OfferCardSkeleton />
          </View>
        </Frame>
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F2F1EC" },
  pageContent: { paddingBottom: spacing.xxl * 2 },

  header: { paddingHorizontal: spacing.md, paddingVertical: spacing.xxl, alignItems: "flex-end" },
  h1: { ...t.h1, fontSize: 34, color: "#14151A", textAlign: "right", writingDirection: "rtl" },
  headerNote: {
    ...t.body,
    color: "#5B5F57",
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: spacing.sm,
    maxWidth: 720,
  },

  section: { paddingVertical: spacing.xxl, paddingHorizontal: spacing.md },
  sectionTitle: { ...t.h1, color: "#14151A", textAlign: "right", writingDirection: "rtl" },
  sectionSubtitle: {
    ...t.caption,
    color: "#5B5F57",
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: spacing.xs,
    maxWidth: 820,
  },

  row: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: spacing.xxl,
    marginTop: spacing.xl,
    alignItems: "flex-start",
  },

  frame: {
    borderRadius: radii.xl,
    overflow: "hidden",
    borderWidth: 1,
  },
  cardPad: { padding: spacing.lg, paddingTop: spacing.xl },

  caption: {
    ...t.caption,
    color: "#5B5F57",
    textAlign: "center",
    marginTop: spacing.md,
    writingDirection: "rtl",
  },
});
