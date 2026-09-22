import React from "react";
import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from "react-native";

import { CustomerHomeBody, CustomerProfileBody, customerTheme, JobCompleteBody, MatchCard, MatchCardSkeleton, OfferCard, OfferCardSkeleton, Persona, PersonaStack, ProJobBody, ProOfferBody, ProOnlineBody, ProProfileBody, ProShiftBody, proTheme, QuoteApprovalBody, radii, scale, SearchingBody, ServiceDetailBody, spacing, TrackingBody, type as t } from "@pro-now/ui";

import {
  FROZEN_NOW_MS,
  matchFixture,
  matchNewProFixture,
  matchPendingEtaFixture,
  offerEstimateFixture,
  offerFixture,
  offerUnknownPayoutFixture,
} from "./fixtures";
import { CustomerSequence, ProSequence } from "./Sequence";
import {
  AVAILABILITY_AT_MS,
  availabilitySnapshot,
  cast,
  castSeeds,
  customerHistory,
  customerOpenCall,
  homeRecent,
  homeServices,
  profileReviews,
  profileServices,
  profileWorkPhotos,
  proServices,
  priceContextFixture,
  priceContextTooEarlyFixture,
  priceContextUsualFixture,
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
            borderColor: dark ? "rgba(255,255,255,0.08)" : "rgba(23,18,31,0.08)",
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

/**
 * A FIXED "now" for the shift frames.
 *
 * The gallery is a review surface, and a screen whose numbers drift while
 * someone is reading it cannot be reviewed — nor screenshotted and compared
 * to the same frame tomorrow. The app passes a real clock; the gallery
 * passes this.
 */
const SHIFT_NOW = Date.parse("2026-09-19T18:00:00.000Z");

export function Gallery() {
  const noop = () => undefined;
  const PHONE_W = usePhoneWidth();
  const shiftServices = proServices.map((s) => ({
    id: s.id,
    nameHe: s.nameHe,
    mark: s.mark,
    live: s.enabled && !s.blockedReasonHe,
  }));

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      <View style={styles.header}>
        <Text style={styles.h1}>PRO NOW — מערכת עיצוב</Text>
        <Text style={styles.headerNote}>
          תצוגת מפתחים. הרכיבים כאן הם הקוד האמיתי מ-packages/ui, לא מוקאפ. הנתונים הם דוגמאות קבועות —
          לא אספקה אמיתית ולא תצלומים אמיתיים.
        </Text>
      </View>

      {/* =============== THE SEQUENCE — interactive =============== */}
      <Section
        title="הרצף — לגעת, לא רק להסתכל"
        subtitle="גריד של מסכים מספר אם כל מסך עשוי טוב. הוא לא מספר אם המוצר מרגיש דבר אחד — וזו השאלה. אז שני המסעים כאן הם רצף שאפשר ללכת בו. החיפוש והספירה לאחור רצים בזמן אמת."
      >
        <View style={{ width: PHONE_W }}>
          <Text style={styles.seqLabel}>הלקוח · מהבית ועד החיוב</Text>
          <CustomerSequence width={PHONE_W} height={PHONE_H} />
        </View>

        <View style={[styles.seqDark, { width: PHONE_W + spacing.lg * 2 }]}>
          <Text style={[styles.seqLabel, { color: proTheme.colors.textSecondary }]}>
            המקצוען · ממחוץ למשמרת ועד הצעה נכנסת
          </Text>
          <ProSequence width={PHONE_W} height={PHONE_H} />
        </View>
      </Section>

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

        <Frame caption="C01 · LIVE · תמונת מצב טרייה מהשרת (בת 10 שניות)">
          <CustomerHomeBody
            greetingHe="ערב טוב"
            addressLabelHe={availabilitySnapshot.areaLabel}
            services={homeServices}
            availability={availabilitySnapshot}
            nowMs={AVAILABILITY_AT_MS + 10_000}
            width={PHONE_W}
          />
        </Frame>

        <Frame caption="C01 · LIVE · אותה תמונת מצב אחרי שפג תוקפה — כל המספרים נעלמים יחד">
          <CustomerHomeBody
            greetingHe="ערב טוב"
            addressLabelHe={availabilitySnapshot.areaLabel}
            services={homeServices}
            availability={availabilitySnapshot}
            nowMs={AVAILABILITY_AT_MS + 61_000}
            width={PHONE_W}
          />
        </Frame>

        <Frame caption="C08 · מסך החתימה — מפה, פעימה, גיליון עולה">
          <SearchingBody
            serviceNameHe="תיקון נזילה בברז"
            elapsedSeconds={38}
            width={PHONE_W}
            height={PHONE_H}
          />
        </Frame>

        <Frame caption="C08 · אין התאמה — מצב שחייב להיראות טוב כמו ההצלחה">
          <SearchingBody
            serviceNameHe="עבודות חשמל"
            elapsedSeconds={95}
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

        {/*
          * THE STRETCH AMIT SAID WAS EMPTY.
          *
          * *"בשלב שהמקצוען התחיל לבדוק ועד להצעת מחיר אין שום דבר בזמן
          * העבודה, אין שום תחלופה במסך."* Between the knock and a price,
          * minutes pass. Both ends of that stretch are here so the thing
          * that now moves between them can actually be reviewed.
          */}
        <Frame caption="C10 · בודק את התקלה — הצעד הראשון מתוך ארבעה">
          <TrackingBody
            status="DIAGNOSIS"
            serviceNameHe="תיקון נזילה בברז"
            professional={matchFixture.professional}
            eta={matchFixture.eta}
            priceLineHe="דמי ביקור ₪179 · הצעת מחיר תישלח לאישורך"
            width={PHONE_W}
            height={PHONE_H}
          />
        </Frame>

        <Frame caption="C10 · הצעת המחיר מחכה — הסימון זז צעד אחד">
          <TrackingBody
            status="WAITING_QUOTE_APPROVAL"
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

      {/* =============== THE CAST =============== */}
      <Section
        title="אנשים"
        subtitle="איורים, לא תצלומים. הם מחממים את המסך בלי לטעון שאדם מסוים קיים וזמין — ותצלום אמיתי של מקצוען תמיד גובר עליהם."
      >
        <View style={styles.castRow}>
          {cast.map((c) => (
            <View key={c.id} style={styles.castItem}>
              <Persona seed={c.id} size={84} ring={customerTheme.colors.trust} />
              <Text style={styles.castName} numberOfLines={1}>
                {c.nameHe}
              </Text>
              <Text style={styles.castTrade} numberOfLines={1}>
                {c.trade}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.stackRow}>
          <PersonaStack seeds={castSeeds} size={44} max={5} />
          <Text style={styles.stackNote}>
            ערימת פנים — רק כשהשרת דיווח מספר אמיתי. לעולם לא כקישוט על מספר מומצא.
          </Text>
        </View>
      </Section>

      {/* =============== CUSTOMER CARD =============== */}
      <Section
        title="הכרטיס שלי"
        subtitle="C14 · לא מסך הגדרות. מה שהמוצר עשה בשבילך, מה פתוח עכשיו, ואז השורות המנהליות — במקום שלהן."
      >
        <Frame caption="C14 · קריאה פתוחה עכשיו + היסטוריה" height={900}>
          <CustomerProfileBody
            displayNameHe="אמית (תצוגה)"
            seed="cust_demo_1"
            homeAreaLabelHe="רמת אביב, תל אביב"
            paymentLabelHe="ויזה · 4417"
            openCalls={customerOpenCall}
            history={customerHistory}
            lifetimeSpendMinorUnits={164400}
            width={PHONE_W}
            height={900}
          />
        </Frame>

        <Frame caption="C14 · לקוח חדש — אומר מה יקרה, לא מתנצל" height={900}>
          <CustomerProfileBody
            displayNameHe="לקוח חדש (תצוגה)"
            seed="cust_demo_2"
            homeAreaLabelHe={null}
            paymentLabelHe={null}
            openCalls={[]}
            history={[]}
            lifetimeSpendMinorUnits={null}
            width={PHONE_W}
            height={900}
          />
        </Frame>

        <Frame caption="C14 · בלי קריאה פתוחה · היסטוריה בלבד" height={900}>
          <CustomerProfileBody
            displayNameHe="אמית (תצוגה)"
            seed="cust_demo_1"
            homeAreaLabelHe="רמת אביב, תל אביב"
            paymentLabelHe="ויזה · 4417"
            openCalls={[]}
            history={customerHistory}
            lifetimeSpendMinorUnits={164400}
            width={PHONE_W}
            height={900}
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

        <Frame caption="C04 · תעריף שעתי · אפס זמינות — בדיקה מחדש, לא הבטחת התראה">
          <ServiceDetailBody {...serviceDetailElectric} width={PHONE_W} height={PHONE_H} />
        </Frame>
      </Section>

      {/* =============== PRO PROFILE =============== */}
      <Section
        title="פרופיל בעל מקצוע"
        subtitle="C12 · שלוש עובדות נפרדות: דירוג PRO NOW, עבודות שהושלמו, ומוניטין חיצוני — לעולם לא מאוחדות לציון אחד."
      >
        <Frame caption="C12 · ותיק · PRO NOW בראש, Google כאישוש שקט מתחת" height={980}>
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

        <Frame caption="C12 · חדש · ״חדש ב-PRO NOW״ במקום מקפים" height={980}>
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

        <Frame caption="C11 · מעל הרגיל · שאלה, לא פסק דין" height={860}>
          <QuoteApprovalBody
            quote={quoteFixture}
            serviceNameHe="תיקון נזילה בברז"
            professionalDisplayName={matchFixture.professional.displayName}
            priceContext={priceContextFixture}
            width={PHONE_W}
            height={860}
          />
        </Frame>

        {/*
          * THE TWO SILENCES, BOTH DELIBERATE, BOTH REVIEWED HERE.
          *
          * A quote in the usual range says nothing — no tick, no "מחיר
          * טוב". Amit: *"אני לא מחפש להיות הכי זול."* And a marketplace
          * with no history says nothing either: a customer looking at a
          * bill does not need to be told what the platform does not know.
          *
          * An absence nobody looks at is an absence nobody notices
          * breaking, which is why both have a frame.
          */}
        <Frame caption="C11 · בטווח הרגיל · המסך שותק בכוונה" height={860}>
          <QuoteApprovalBody
            quote={quoteFixture}
            serviceNameHe="תיקון נזילה בברז"
            professionalDisplayName={matchFixture.professional.displayName}
            priceContext={priceContextUsualFixture}
            width={PHONE_W}
            height={860}
          />
        </Frame>

        <Frame caption="C11 · אין עדיין מספיק עבודות · שותק גם כאן" height={860}>
          <QuoteApprovalBody
            quote={quoteFixture}
            serviceNameHe="תיקון נזילה בברז"
            professionalDisplayName={matchFixture.professional.displayName}
            priceContext={priceContextTooEarlyFixture}
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

      {/* =============== PRO SHIFT INTELLIGENCE =============== */}
      <Section
        dark
        title="המשמרת שלי"
        subtitle="P01 · לפני המשמרת: האם שווה להתחבר עכשיו. בתוך המשמרת: האם המשמרת עובדת. שני מסכים במסגרת אחת — ומה שאין לנו, לא נמציא."
      >
        <Frame dark caption="מחוץ למשמרת · תדריך חלקי — אין נתוני ביקוש, והמסך לא ממציא">
          <ProShiftBody
            displayNameHe="דוגמה ד׳ (תצוגה)"
            presenceState="OFFLINE"
            shift={{ onlineSinceMs: null, settledNetMinorUnits: null, completedJobs: 0 }}
            briefing={{ peersOnline: 2, lastWeekNetMinorUnits: 384000, lastWeekOnlineMinutes: 1215 }}
            services={shiftServices}
            nowMs={SHIFT_NOW}
            width={PHONE_W}
            height={PHONE_H}
          />
        </Frame>

        <Frame dark caption="מחוץ למשמרת · השרת לא דיווח כלום. אפס שורות — וזה מצב מתוכנן">
          <ProShiftBody
            displayNameHe="דוגמה ד׳ (תצוגה)"
            presenceState="OFFLINE"
            shift={{ onlineSinceMs: null, settledNetMinorUnits: null, completedJobs: 0 }}
            briefing={{}}
            services={shiftServices}
            nowMs={SHIFT_NOW}
            width={PHONE_W}
            height={PHONE_H}
          />
        </Frame>

        <Frame dark caption="9 דקות במשמרת · ₪120 — אריתמטית ₪800 לשעה. המסך מסרב, ומסביר למה">
          <ProShiftBody
            displayNameHe="דוגמה ד׳ (תצוגה)"
            presenceState="AVAILABLE"
            shift={{
              onlineSinceMs: SHIFT_NOW - 9 * 60_000,
              settledNetMinorUnits: 12000,
              completedJobs: 1,
            }}
            services={shiftServices}
            nowMs={SHIFT_NOW}
            width={PHONE_W}
            height={PHONE_H}
          />
        </Frame>

        <Frame dark caption="3 שעות במשמרת · עכשיו הרווח לשעה אומר משהו, ומוצג">
          <ProShiftBody
            displayNameHe="דוגמה ד׳ (תצוגה)"
            presenceState="AVAILABLE"
            shift={{
              onlineSinceMs: SHIFT_NOW - 185 * 60_000,
              settledNetMinorUnits: 61500,
              completedJobs: 4,
              inProgressJobs: 1,
              busyMinutes: 128,
            }}
            services={shiftServices}
            nowMs={SHIFT_NOW}
            width={PHONE_W}
            height={PHONE_H}
          />
        </Frame>

        <Frame dark caption="משמרת ארוכה ושקטה · ₪0 לשעה. מספר אמיתי, גם כשהוא לא נעים">
          <ProShiftBody
            displayNameHe="דוגמה ד׳ (תצוגה)"
            presenceState="AVAILABLE"
            shift={{
              onlineSinceMs: SHIFT_NOW - 150 * 60_000,
              settledNetMinorUnits: 0,
              completedJobs: 0,
              busyMinutes: 0,
            }}
            services={shiftServices}
            nowMs={SHIFT_NOW}
            width={PHONE_W}
            height={PHONE_H}
          />
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

      {/* =============== OFFER AS AN EVENT =============== */}
      <Section
        dark
        title="הצעת עבודה — כאירוע"
        subtitle="P16 · לא כרטיס עם עוד ריפוד. המפה היא הבמה, התשלום הוא הדבר הגדול במסך, הטבעת נקראת ממרחק זרוע, ויש פעולה חיובית אחת."
      >
        <Frame dark caption="P16 · תשלום ידוע · 30 שניות · טבעת רגועה">
          <ProOfferBody offer={offerFixture} nowMs={FROZEN_NOW_MS} onAccept={noop} onSkip={noop} width={PHONE_W} height={PHONE_H} />
        </Frame>

        <Frame dark caption="P16 · תשלום משוער · נותרו 10 שניות">
          <ProOfferBody offer={offerEstimateFixture} nowMs={FROZEN_NOW_MS + 20000} onAccept={noop} onSkip={noop} width={PHONE_W} height={PHONE_H} />
        </Frame>

        {/* Two taps on "אני לוקח" send two accepts, and the second returns
            OFFER_NO_LONGER_AVAILABLE — indistinguishable from somebody else
            having taken it. The professional would be told they lost the job
            they had just won. Both actions go quiet on the first touch. */}
        <Frame dark caption="P16 · התשובה בדרך — הפעולות שותקות">
          <ProOfferBody offer={offerFixture} nowMs={FROZEN_NOW_MS} responding onAccept={noop} onSkip={noop} width={PHONE_W} height={PHONE_H} />
        </Frame>

        <Frame dark caption="P16 · הסכום לא ידוע מראש — נאמר, לא הומצא">
          <ProOfferBody offer={offerUnknownPayoutFixture} nowMs={FROZEN_NOW_MS + 26000} onAccept={noop} onSkip={noop} width={PHONE_W} height={PHONE_H} />
        </Frame>

        {/*
          * THE PROFESSIONAL'S OWN JOB SCREEN, WHICH THE GALLERY HAD NEVER
          * SHOWN AT ALL.
          *
          * It lives only in the flow app, reachable by accepting an offer
          * — so the one screen a professional spends a whole visit on
          * could not be reviewed. Both halves of the stretch Amit called
          * empty are here: the diagnosis, and the wait for the customer's
          * answer, where this side has no button to press because the
          * next move is not its own.
          */}
        <Frame dark caption="P18 · באבחון · אותם ארבעה צעדים שהלקוח רואה">
          <ProJobBody
            status="DIAGNOSIS"
            serviceNameHe="תיקון נזילה בברז"
            mark="plumbing"
            addressHe="רחוב הברזל 12, רמת אביב, תל אביב"
            accessNoteHe="קומה 3, דירה 9 · קוד כניסה 1408"
            routeEtaMinutes={9}
            distanceHe="2.4 ק״מ"
            customerNameHe="אמית (תצוגה)"
            customerSeed="cust_demo_1"
            symptomsHe={["נזילה מתחת לכיור", "התחיל אתמול"]}
            descriptionHe="יש מים על הרצפה כל בוקר."
            media={[]}
            payoutMinorUnits={null}
            payoutIsEstimate={false}
            width={PHONE_W}
            height={PHONE_H}
          />
        </Frame>

        <Frame dark caption="P18 · ממתין לאישור הלקוח · אין כפתור, ויש מצב">
          <ProJobBody
            status="WAITING_QUOTE_APPROVAL"
            serviceNameHe="תיקון נזילה בברז"
            mark="plumbing"
            addressHe="רחוב הברזל 12, רמת אביב, תל אביב"
            accessNoteHe="קומה 3, דירה 9 · קוד כניסה 1408"
            routeEtaMinutes={9}
            distanceHe="2.4 ק״מ"
            customerNameHe="אמית (תצוגה)"
            customerSeed="cust_demo_1"
            symptomsHe={["נזילה מתחת לכיור", "התחיל אתמול"]}
            descriptionHe="יש מים על הרצפה כל בוקר."
            media={[]}
            payoutMinorUnits={null}
            payoutIsEstimate={false}
            waitingMinutes={3}
            width={PHONE_W}
            height={PHONE_H}
          />
        </Frame>

        <Frame dark caption="P16 · הסתיימה · הפעולות נעלמות, לא נכשלות">
          <ProOfferBody offer={offerFixture} nowMs={FROZEN_NOW_MS + 40000} onAccept={noop} onSkip={noop} width={PHONE_W} height={PHONE_H} />
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
  page: { flex: 1, backgroundColor: "#F3ECE1" },
  pageContent: { paddingBottom: spacing.xxl * 2 },

  header: { paddingHorizontal: spacing.md, paddingVertical: spacing.xxl, alignItems: "flex-end" },
  h1: { ...t.h1, fontSize: scale.title, color: "#17121F", textAlign: "right", writingDirection: "rtl" },
  headerNote: {
    ...t.body,
    color: "#5A5266",
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: spacing.sm,
    maxWidth: 720,
  },

  section: { paddingVertical: spacing.xxl, paddingHorizontal: spacing.md },
  sectionTitle: { ...t.h1, color: "#17121F", textAlign: "right", writingDirection: "rtl" },
  sectionSubtitle: {
    ...t.caption,
    color: "#5A5266",
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

  seqLabel: {
    ...t.captionStrong,
    color: "#17121F",
    textAlign: "right",
    writingDirection: "rtl",
    marginBottom: spacing.md,
  },
  seqDark: {
    backgroundColor: proTheme.colors.bg,
    borderRadius: radii.xl,
    padding: spacing.lg,
  },

  castRow: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing.xl, alignItems: "flex-start" },
  castItem: { alignItems: "center", width: 104 },
  castName: {
    ...t.caption,
    color: "#17121F",
    marginTop: spacing.sm,
    textAlign: "center",
    writingDirection: "rtl",
  },
  castTrade: { ...t.caption, fontSize: scale.micro, color: "#5A5266", writingDirection: "rtl" },

  stackRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.lg,
    marginTop: spacing.xxl,
    flexWrap: "wrap",
  },
  stackNote: { ...t.caption, color: "#5A5266", writingDirection: "rtl", flexShrink: 1, maxWidth: 520 },

  caption: {
    ...t.caption,
    color: "#5A5266",
    textAlign: "center",
    marginTop: spacing.md,
    writingDirection: "rtl",
  },
});
