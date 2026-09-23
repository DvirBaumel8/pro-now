import React, { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import {
  formatMoney,
  money,
  type ExternalReputationView,
  type ProfessionalSummaryView,
} from "@pro-now/types";

import { BackButton } from "../components/BackButton";
import { customerTheme, elevation, radii, scale, spacing, tabular, tint, type } from "../theme";
import { formatCompletedJobs, formatProNowRating } from "../format";
import { Mark, type MarkName, ShieldCheckMark, StarMark } from "../components/marks";
import { Persona } from "../components/Persona";
import { HeroFlourish, ImageSlot, SectionHeader, Surface } from "../components/surfaces";
import { VerificationBadge, type VerificationKind } from "../components/VerificationBadge";

/**
 * C12 — the professional's profile, as the customer sees it.
 *
 * This is the page that decides whether a stranger is let into someone's
 * home, so it is the page most likely to be "improved" into a lie. Three
 * rules hold it honest:
 *
 * 1. **Reputation is never merged.** PRO NOW's own rating and any imported
 *    external rating are rendered as two separate, separately-labelled
 *    facts (/docs/10-TRUST-VERIFICATION.md §Reputation import). There is no
 *    combined score, and this component has no prop that could carry one.
 * 2. **Absence is shown as absence.** No rating yet, no reviews yet, no work
 *    photos yet — each renders its own honest state rather than being
 *    padded with a placeholder that implies experience
 *    (/CLAUDE.md §3).
 * 3. **Badges are enumerated facts.** They come from the server's
 *    `verifications` list; nothing here can invent one.
 *
 * ONLINE-FIRST caveat: this profile is reached from a match or from job
 * history — it is NOT a browse-and-pick directory, which the MVP forbids
 * (/CLAUDE.md §3). `onRequestNow` is therefore absent by design.
 */

const colors = customerTheme.colors;

export interface ProProfileServiceItem {
  id: string;
  nameHe: string;
  mark: MarkName;
  /** Pricing headline, already formatted by the caller from PriceQuoteView. */
  priceHintHe: string | null;
}

export interface ProProfileReviewItem {
  id: string;
  rating: number;
  textHe: string | null;
  /** "לפני שבועיים" — relative, so no exact date leaks about the reviewer. */
  whenHe: string;
  /** First name + initial only. Never a full name, never a photo. */
  reviewerLabelHe: string;
  /** The service the review is attached to — a rating is service-specific. */
  serviceNameHe: string;
}

export interface ProProfileBodyProps {
  professional: ProfessionalSummaryView;
  /** What the professional is actually dispatch-eligible for, per service. */
  services: ProProfileServiceItem[];
  reviews: ProProfileReviewItem[];
  /** Subjects for licensed photos of completed work. Never stock imagery. */
  workPhotoSubjects: string[];
  /**
   * THE SHOP, FROM INSIDE IT.
   *
   * Amit: *"איך עושים שבלחיצה על המקצוען נכנסים לתוך החנות שלו ממש
   * בפנים, שיראו את הדברים הקטנים שעבדנו עליהם?"*
   *
   * The camera already travels to the shopfront and holds before this
   * card rises. What it could not do was go IN, because the only picture
   * of the shop was its façade, and the detail he is talking about — the
   * shelves, the bench, the tools — is on the other side of the glass in
   * that drawing.
   *
   * So the card opens with the interior when the trade has one: see
   * `venueInteriorAssetId`. Absent, the card opens as it always did. No
   * placeholder and no stand-in from another trade — a plumber's profile
   * showing a barber's chair is a claim about a business.
   */
  shopInteriorUri?: string | null;
  /**
   * OUT, AND INTO THE NEXT ONE.
   *
   * Amit: *"ואם אני עושה דלג אז חוזר לרחוב ועובר לחנות הבאה."* Closing
   * this card put the customer back on the street and left them there,
   * which makes comparing two businesses a matter of finding the next
   * shopfront yourself. This is the same journey the street's own taps
   * run — out, along, in — asked for from here.
   *
   * Absent when there is nobody else to see, and then the card simply
   * closes.
   */
  onNext?: () => void;
  /** Year the professional started in the trade, when they have stated it. */
  activeSinceYear: number | null;
  /** Coarse service area, never an address. */
  areaLabelHe: string | null;
  /** Typical visit fee across this professional's services, when knowable. */
  fromPriceMinorUnits: number | null;
  onBack?: () => void;
  width?: number;
  height?: number;
}

/**
 * How many reviews a profile opens with. Two is enough to show that
 * real people have written real sentences; the rest are a deliberate
 * question and live behind a control.
 */
const REVIEWS_SHOWN = 2;

export function ProProfileBody({
  professional,
  services,
  reviews,
  workPhotoSubjects,
  shopInteriorUri = null,
  onNext,
  activeSinceYear,
  areaLabelHe,
  fromPriceMinorUnits,
  onBack,
  width = 390,
  height = 780,
}: ProProfileBodyProps) {
  const rating = formatProNowRating(professional.proNowRatingAverage, professional.proNowRatingCount);
  const jobs = formatCompletedJobs(professional.proNowCompletedJobs);
  const [allReviews, setAllReviews] = useState(false);
  const shownReviews = allReviews ? reviews : reviews.slice(0, REVIEWS_SHOWN);

  return (
    <View style={[styles.screen, { width, height }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* ----------------------------------------------------------------
            INSIDE THE SHOP, WHEN THERE IS AN INSIDE TO SHOW.

            Above the portrait and the name, because it is the thing the
            camera was travelling towards: you pressed a building, you
            arrive in it, and then you are told whose it is. The other
            order reads as a profile page that happens to have a photo.
            ---------------------------------------------------------------- */}
        {shopInteriorUri ? (
          <Image
            source={{ uri: shopInteriorUri }}
            style={styles.interior}
            resizeMode="cover"
            accessible
            accessibilityRole="image"
            accessibilityLabel={`בתוך העסק של ${professional.displayName}`}
          />
        ) : null}

        {/* ---------------- Hero ---------------- */}
        <View style={styles.hero}>
          <HeroFlourish color={colors.trust} opacity={0.12} />

          <BackButton onPress={onBack} tone={"light"} placement="absolute" />

          {/* ----------------------------------------------------------
              OUT, AND INTO THE NEXT ONE. See `onNext`.

              Opposite the back control and at the same height, because
              they are the two ways out of this card and one of them
              should not be hidden at the bottom of a page that scrolls
              for fifteen hundred points.
              ---------------------------------------------------------- */}
          {onNext ? (
            <Pressable
              onPress={onNext}
              accessibilityRole="button"
              accessibilityLabel="דילוג לחנות הבאה"
              style={({ pressed }) => [styles.next, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.nextLabel}>החנות הבאה ›</Text>
            </Pressable>
          ) : null}

          {/*
            * A real photo when the professional has uploaded one; otherwise
            * an illustration, not an empty grey square. The illustration is
            * visibly a drawing, so it warms the page without implying a
            * likeness we do not have.
            */}
          <View style={styles.heroPortrait}>
            {professional.profilePhotoUrl ? (
              <ImageSlot
                subject={`תצלום פרופיל · ${professional.displayName}`}
                ratio={1}
                radius={radii.lg}
                colors={colors}
                style={styles.portrait}
                /*
                 * The whole figure, not the middle of one. These are
                 * full-length illustrated professionals, and a square
                 * that crops to fill showed a tool belt with no head.
                 */
                fit="contain"
                uri={professional.profilePhotoUrl}
              />
            ) : (
              <Persona
                seed={professional.id}
                size={132}
                ring={colors.trust}
                label={`איור · ${professional.displayName}`}
              />
            )}
          </View>

          <Text style={styles.name} numberOfLines={1}>
            {professional.displayName}
          </Text>

          <Text style={styles.subline} numberOfLines={2}>
            {[
              services.length === 1 ? services[0]?.nameHe : services.length > 1 ? `${services.length} שירותים` : null,
              areaLabelHe,
              activeSinceYear ? `בתחום משנת ${activeSinceYear}` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </Text>

          {/*
           * Trust has a primary source and a secondary one, and they are not
           * given equal weight. PRO NOW's own rating and job count are the
           * facts this product is accountable for, so they own the hero row;
           * an imported external rating is corroboration and sits quieter,
           * below, still labelled by its source. They are never summed — the
           * separation is the point (/docs/10-TRUST-VERIFICATION.md).
           *
           * A professional with no PRO NOW rating yet is NEW, not deficient.
           * Three dashes read as missing data; "חדש ב-PRO NOW" is the true
           * and more useful statement of the same fact.
           */}
          <View style={styles.factRow}>
            {rating ? (
              <>
                <Fact
                  value={rating.rating}
                  label={`${rating.count} ביקורות`}
                  icon={<StarMark size={15} color={colors.statusWarning} />}
                />
                <View style={styles.factDivider} />
                <Fact value={String(professional.proNowCompletedJobs)} label="עבודות ב-PRO NOW" />
              </>
            ) : (
              <Fact
                value="חדש"
                label={jobs ?? "טרם הושלמו עבודות ב-PRO NOW"}
                icon={<ShieldCheckMark size={15} color={colors.trust} />}
              />
            )}
            <View style={styles.factDivider} />
            <Fact
              value={fromPriceMinorUnits !== null ? formatMoney(money(fromPriceMinorUnits, "ILS")) : "—"}
              label={fromPriceMinorUnits !== null ? "החל מ־" : "משתנה לפי עבודה"}
              muted={fromPriceMinorUnits === null}
            />
          </View>

          {professional.externalReputation &&
          professional.externalReputation.ratingAverage !== null &&
          professional.externalReputation.ratingCount ? (
            <Text style={styles.extQuiet} numberOfLines={1}>
              מחוץ ל-PRO NOW · {professional.externalReputation.source}{" "}
              {professional.externalReputation.ratingAverage.toFixed(1)} ·{" "}
              {professional.externalReputation.ratingCount} ביקורות
            </Text>
          ) : null}
        </View>

        {/* ---------------- Verification ---------------- */}
        <View style={styles.block}>
          <SectionHeader title="מה אומת" colors={colors} />
          {professional.verifications.length === 0 ? (
            <Surface colors={colors} level={0} style={styles.warnCard}>
              <Text style={styles.warnText}>
                טרם הושלם אימות עבור בעל מקצוע זה. לא נשלח אליך בעל מקצוע שלא אומת לשירות המבוקש.
              </Text>
            </Surface>
          ) : (
            <View style={styles.badges}>
              {professional.verifications.map((v) => (
                <VerificationBadge key={v} kind={v as VerificationKind} />
              ))}
            </View>
          )}
          <View style={styles.assuranceRow}>
            <ShieldCheckMark size={16} color={colors.trust} />
            <Text style={styles.assurance}>
              האימות נבדק מול כל שירות בנפרד — בעל מקצוע מאושר לשירות אחד אינו מאושר אוטומטית לאחר.
            </Text>
          </View>
        </View>

        {/* ---------------- Services ---------------- */}
        <View style={styles.block}>
          <SectionHeader title="שירותים מאושרים" colors={colors} />
          <View style={styles.serviceList}>
            {services.map((s) => (
              <View key={s.id} style={styles.serviceRow}>
                <View style={styles.serviceMark}>
                  <Mark name={s.mark} size={19} color={colors.trust} />
                </View>
                <View style={styles.serviceText}>
                  <Text style={styles.serviceName} numberOfLines={1}>
                    {s.nameHe}
                  </Text>
                  <Text style={styles.servicePrice} numberOfLines={1}>
                    {s.priceHintHe ?? "המחיר ייקבע לאחר אבחון באתר"}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ---------------- Work ---------------- */}
        <View style={styles.block}>
          <SectionHeader title="עבודות קודמות" colors={colors} />
          {workPhotoSubjects.length === 0 ? (
            <Text style={styles.emptyLine}>עדיין לא הועלו תצלומי עבודה.</Text>
          ) : (
            /*
             * A wrapped grid rather than a horizontal strip. A horizontal
             * ScrollView inside a `row-reverse` RTL layout opens on the wrong
             * end in the browser preview, and a gallery whose first photo is
             * clipped reads as broken even when the device is fine. The grid
             * shows every photo on both.
             */
            <View style={styles.workGrid}>
              {workPhotoSubjects.map((subject, i) => (
                <ImageSlot
                  key={`${subject}-${i}`}
                  subject={subject}
                  ratio={4 / 3}
                  colors={colors}
                  style={styles.workPhoto}
                />
              ))}
            </View>
          )}
        </View>

        {/* ---------------- External reputation, kept separate ---------------- */}
        {professional.externalReputation ? (
          <View style={styles.block}>
            <SectionHeader title="מוניטין ממקור חיצוני" colors={colors} />
            <ExternalReputation rep={professional.externalReputation} />
          </View>
        ) : null}

        {/* ---------------- Reviews ---------------- */}
        <View style={styles.block}>
          <SectionHeader
            title={rating ? `ביקורות ב-PRO NOW · ${rating.count}` : "ביקורות ב-PRO NOW"}
            colors={colors}
          />
          {reviews.length === 0 ? (
            <Surface colors={colors} level={0} style={styles.warnCard}>
              <Text style={styles.emptyLine}>
                אין עדיין ביקורות מאומתות. ביקורת נפתחת רק ללקוח שעבודתו הושלמה בפועל דרך PRO NOW.
              </Text>
            </Surface>
          ) : (
            <View style={styles.reviewList}>
              {shownReviews.map((r) => (
                <Surface key={r.id} colors={colors} level={1} style={styles.reviewCard}>
                  <View style={styles.reviewHead}>
                    <Stars rating={r.rating} />
                    <View style={styles.reviewWhoRow}>
                      <Persona seed={r.id} size={26} />
                      <Text style={styles.reviewWho} numberOfLines={1}>
                        {r.reviewerLabelHe}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.reviewMeta} numberOfLines={1}>
                    {r.serviceNameHe} · {r.whenHe}
                  </Text>
                  {r.textHe ? (
                    <Text style={styles.reviewText}>{r.textHe}</Text>
                  ) : (
                    <Text style={styles.reviewNoText}>דירוג ללא טקסט</Text>
                  )}
                </Surface>
              ))}
              {/* ----------------------------------------------------------
                  THE REST OF THEM, FOLDED.

                  Amit: *"הגלילה על פרטי המקצוען ארוכה מדי."* He is right,
                  and the reviews were most of it — every one of them, in
                  full, below four other sections, on a card somebody
                  opened to answer "should I let this person into my
                  flat".

                  Two answers that question. The rest answer a different
                  one — "am I sure" — and that is a question somebody
                  asks deliberately, which is what a control is for.

                  Folded, not truncated: nothing is hidden from the
                  customer, and the count is on the button so the number
                  of reviews is still visible without opening it. That
                  matters — the count is part of how trustworthy the
                  rating looks, and quietly showing two of eleven would
                  understate a professional's own record.
                  ---------------------------------------------------------- */}
              {reviews.length > REVIEWS_SHOWN ? (
                <Pressable
                  onPress={() => setAllReviews((v) => !v)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: allReviews }}
                  accessibilityLabel={
                    allReviews
                      ? "הצגת ביקורות מקוצרת"
                      : `הצגת כל ${reviews.length} הביקורות`
                  }
                  style={({ pressed }) => [styles.moreReviews, pressed && { opacity: 0.7 }]}
                >
                  <Text style={styles.moreReviewsText}>
                    {allReviews
                      ? "פחות ביקורות"
                      : `עוד ${reviews.length - REVIEWS_SHOWN} ביקורות ›`}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          )}
        </View>

        <Text style={styles.footnote}>
          מספר הטלפון והכתובת המלאה נחשפים רק לאחר שיוך עבודה, לשני הצדדים.
        </Text>
      </ScrollView>

      {/* ----------------------------------------------------------------
          THERE IS MORE BELOW, AND NOTHING SAID SO.

          Amit: *"למה זה עין מסך תצוגה שלא נגלל?"* It scrolls — measured:
          1557 points of content in a 259 point window — and nothing on
          the screen admitted it. A card whose content ends flush with
          its own edge reads as a card that ends there, so the services,
          the verifications and the reviews under the fold were, to a
          person looking at it, not there.

          A fade rather than an arrow or a bar: it says "this continues"
          without adding a control that does nothing when pressed.
          ---------------------------------------------------------------- */}
      <View style={styles.moreBelow} pointerEvents="none">
        <Svg width="100%" height={28}>
          <Defs>
            <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.bg} stopOpacity="0" />
              <Stop offset="1" stopColor={colors.bg} stopOpacity="0.95" />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width="100%" height={28} fill="url(#fade)" />
        </Svg>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------

function Fact({
  value,
  label,
  icon,
  muted = false,
}: {
  value: string;
  label: string;
  icon?: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <View style={styles.fact}>
      <View style={styles.factValueRow}>
        {icon}
        <Text style={[styles.factValue, muted && { color: colors.textSecondary }]} numberOfLines={1}>
          {value}
        </Text>
      </View>
      <Text style={styles.factLabel} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

/**
 * Five outlined stars with the filled ones coloured. Deliberately not a
 * numeric badge: a single review must not look like an established score.
 */
function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  const whole = Math.round(rating);
  return (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((i) => (
        <StarMark
          key={i}
          size={size}
          filled={i <= whole}
          color={i <= whole ? colors.statusWarning : colors.border}
        />
      ))}
    </View>
  );
}

function ExternalReputation({ rep }: { rep: ExternalReputationView }) {
  const hasNumbers = rep.ratingAverage !== null && rep.ratingCount !== null && rep.ratingCount > 0;
  return (
    <Surface colors={colors} level={1} style={styles.extCard}>
      <View style={styles.extHead}>
        {hasNumbers ? (
          <Text style={styles.extValue}>
            {rep.ratingAverage!.toFixed(1)}
            <Text style={styles.extCount}> · {rep.ratingCount} ביקורות</Text>
          </Text>
        ) : (
          <Text style={styles.extCount}>מקושר · ללא נתוני דירוג</Text>
        )}
        <Text style={styles.extSource} numberOfLines={1}>
          {rep.source}
        </Text>
      </View>
      <Text style={styles.extNote}>
        נתון זה מגיע מפלטפורמה חיצונית ואינו מחושב יחד עם הדירוג ב-PRO NOW. שתי המדידות נשארות נפרדות.
      </Text>
    </Surface>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.bg, overflow: "hidden", borderRadius: radii.xl },
  next: {
    position: "absolute",
    top: spacing.lg,
    left: spacing.lg,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceElevated,
    zIndex: 2,
  },
  nextLabel: { ...type.captionStrong, color: colors.textPrimary, writingDirection: "rtl" },
  moreBelow: { position: "absolute", left: 0, right: 0, bottom: 0, height: 28 },
  scroll: { paddingBottom: spacing.xxl },

  /*
   * A band rather than a full bleed: this card is a sheet with a rounded
   * top, and a picture that fills the width above the name reads as a
   * window into the shop. 16:9 is what the interiors are drawn at.
   */
  interior: {
    width: "100%",
    /*
     * 4:3, NOT 16:9.
     *
     * Amit: *"פחות זום אין בחנות שיראו יותר מה קורה שם."* The interiors
     * are about 1.3 wide to 1 tall; a 16:9 window is 1.78, so `cover`
     * was cutting a quarter of the room off the top and bottom — the
     * ceiling lamps and the floor, which is most of what makes a room
     * look like a room. 4:3 is within two percent of the artwork, so
     * almost nothing is lost.
     */
    aspectRatio: 4 / 3,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
  },
  hero: {
    backgroundColor: colors.surface,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: radii.xl,
    borderBottomRightRadius: radii.xl,
    alignItems: "center",
    overflow: "hidden",
    ...elevation(1),
  },
  // 44x44 minimum. A 25px chevron is a control most thumbs miss, which
  // is the same defect that made the demo bar unhittable.

  heroPortrait: { width: 132, ...elevation(2) },
  portrait: { width: 132 },

  name: { ...type.h1, color: colors.textPrimary, marginTop: spacing.lg, writingDirection: "rtl" },
  subline: {
    ...type.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: "center",
    writingDirection: "rtl",
  },

  factRow: {
    flexDirection: "row-reverse",
    alignItems: "stretch",
    marginTop: spacing.xl,
    alignSelf: "stretch",
    backgroundColor: tint.neutralLight(0.035),
    borderRadius: radii.md,
    paddingVertical: spacing.md,
  },
  fact: { flex: 1, alignItems: "center", paddingHorizontal: spacing.xs },
  factDivider: { width: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  factValueRow: { flexDirection: "row-reverse", alignItems: "center", gap: 4 },
  factValue: { ...type.h3, ...tabular, color: colors.textPrimary },
  extQuiet: {
    ...type.caption,
    color: colors.textSecondary,
    marginTop: spacing.md,
    writingDirection: "rtl",
  },

  factLabel: {
    ...type.caption,
    fontSize: scale.micro,
    lineHeight: 15,
    color: colors.textSecondary,
    textAlign: "center",
    writingDirection: "rtl",
    marginTop: 2,
  },

  block: { paddingHorizontal: spacing.lg, marginTop: spacing.xl },

  badges: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing.sm },
  warnCard: { backgroundColor: tint.neutralLight(0.035) },
  warnText: { ...type.caption, color: colors.textSecondary, textAlign: "right", writingDirection: "rtl", lineHeight: 19 },

  assuranceRow: { flexDirection: "row-reverse", alignItems: "flex-start", gap: spacing.sm, marginTop: spacing.md },
  assurance: {
    ...type.caption,
    flex: 1,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 18,
  },

  serviceList: { gap: spacing.sm },
  serviceRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    ...elevation(1),
  },
  serviceMark: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: tint.trust(0.12),
    alignItems: "center",
    justifyContent: "center",
  },
  serviceText: { flex: 1, alignItems: "flex-end" },
  serviceName: { ...type.bodyStrong, color: colors.textPrimary, writingDirection: "rtl" },
  servicePrice: { ...type.caption, color: colors.textSecondary, writingDirection: "rtl" },

  workGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing.sm },
  workPhoto: { flexGrow: 1, flexBasis: "46%" },

  extCard: {},
  extHead: { flexDirection: "row-reverse", alignItems: "baseline", justifyContent: "space-between" },
  extSource: { ...type.captionStrong, color: colors.textSecondary },
  extValue: { ...type.h3, ...tabular, color: colors.textPrimary },
  extCount: { ...type.caption, color: colors.textSecondary },
  extNote: {
    ...type.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 18,
  },

  reviewList: { gap: spacing.md },
  moreReviews: { minHeight: 44, justifyContent: "center" },
  moreReviewsText: {
    ...type.bodyStrong,
    color: colors.actionText ?? colors.action,
    textAlign: "right",
    writingDirection: "rtl",
  },
  reviewCard: {},
  reviewHead: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  stars: { flexDirection: "row-reverse", gap: 2 },
  reviewWhoRow: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm },
  reviewWho: { ...type.captionStrong, color: colors.textPrimary, writingDirection: "rtl" },
  reviewMeta: { ...type.caption, color: colors.textSecondary, textAlign: "right", writingDirection: "rtl", marginTop: 2 },
  reviewText: {
    ...type.body,
    fontSize: scale.meta,
    color: colors.textPrimary,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: spacing.sm,
  },
  reviewNoText: { ...type.caption, color: colors.textSecondary, textAlign: "right", marginTop: spacing.sm },

  emptyLine: { ...type.caption, color: colors.textSecondary, textAlign: "right", writingDirection: "rtl", lineHeight: 19 },

  footnote: {
    ...type.caption,
    color: colors.textSecondary,
    textAlign: "center",
    writingDirection: "rtl",
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xl,
    lineHeight: 18,
  },
});
