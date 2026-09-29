import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, PanResponder, Pressable, StyleSheet, Text, View } from "react-native";

import { CUSTOMER_POINT, venueSlots, WALK_START } from "@pro-now/demo-types";

import { Scrim } from "../components/Scrim";
import { WorldBackdrop } from "../components/livingmap/WorldBackdrop";
import { EMPTY_ASSET_SOURCES, type WorldAssetSources } from "../components/livingmap/AssetSlot";
import { customerDarkTheme, palette, proTheme, radii, spacing, type } from "../theme";

/**
 * C00 / P00 — WHERE ARE WE, AND WHY AM I BEING ASKED THIS.
 *
 * ---------------------------------------------------------------------
 * WHY THIS SCREEN EXISTS
 * ---------------------------------------------------------------------
 * Amit, twice on the same morning, first as a question and then as a
 * brief:
 *
 *   *"איפה מסך ראשון הסבר על האפליקציה לפני האווטאר? איך הוא יבין למה
 *   הוא נכנס?"*
 *
 *   *"חייב עמוד הסבר בהתחלה לאן הגענו, של שלושה עמודים מתחלפים כאלה
 *   שעושים הבא הבא, שימשיך את העולם הוירטואלי שלנו, שיפגע בול ללקוח
 *   ובול למקצוען. הסבר קצר, בוחרים אווטאר, נכנסים לעולם הוירטואלי
 *   ומזמינים מקצוען עד הבית now."*
 *
 * He is right about the gap and precise about its shape. Signing in used
 * to hand a customer straight to "מי מטייל ברחוב?" — a grid of twelve
 * strangers and a question about which of them they are. Nobody had yet
 * told them that this product is a city, that professionals are shops in
 * it, or that the figure they are about to choose is how they walk
 * through it. The picker is a charming screen and, arriving cold, an
 * inexplicable one.
 *
 * ---------------------------------------------------------------------
 * THREE, AND WHAT EACH ONE IS FOR
 * ---------------------------------------------------------------------
 * Not a tour and not a feature list. Each slide answers one of the three
 * questions somebody actually has on the way in, in order:
 *
 *   1. WHERE AM I — this is a city, and every professional is a business
 *      standing in it.
 *   2. WHO AM I — you pick somebody, and that is how you move around.
 *   3. WHAT HAPPENS — you send a call and a real person comes to your
 *      door, now.
 *
 * The professional's three are the same three questions from the other
 * side of the counter: this street is yours too, you decide when you are
 * live, and you see the work before you take it.
 *
 * ---------------------------------------------------------------------
 * IT IS THE WORLD, NOT A SLIDESHOW ABOUT IT
 * ---------------------------------------------------------------------
 * *"שימשיך את העולם הוירטואלי שלנו."* So the background is the same
 * neighbourhood plate every other screen uses, and each slide LOOKS
 * somewhere different in it — wide over the whole quarter, then in
 * among the shopfronts, then close on one door. Moving the camera rather
 * than swapping a picture means the three slides are demonstrably one
 * place, which is the entire claim being made.
 *
 * Nothing here promises a time, a price, a professional or a count. The
 * only numbers on this screen are the slide numbers.
 */

/** Where the camera looks, and how close, for each slide. */
interface Slide {
  titleHe: string;
  bodyHe: string;
  /** A point in the world, and how much of the world to show. */
  focus: { u: number; v: number };
  zoom: number;
}

/*
 * ---------------------------------------------------------------------
 * EACH SLIDE LOOKS AT THE THING ITS SENTENCE IS ABOUT
 * ---------------------------------------------------------------------
 * Amit: *"גם בהסבר בהתחלה זה סתם קופץ תמונות לא רלוונטיות של מדרכות."*
 *
 * He is right and a screenshot settles it. The third slide says "ומזמינים
 * עד הבית... רואים אותו בדרך, עד הדלת" — and the camera was pointed at
 * 0.34,0.85, which on this plate is a flowerbed and a bench. The largest
 * thing in frame was a purple tree. A sentence about somebody arriving at
 * your door, over a picture of some paving.
 *
 * The coordinates were chosen for composition. They are chosen for
 * MEANING now, and taken from the places the rest of the product already
 * measures rather than typed in by eye:
 *
 *   - the quarter, wide, where the shopfronts are;
 *   - `WALK_START`, which is literally where the customer's own figure is
 *     put down when they walk the street — the slide that says so;
 *   - `CUSTOMER_POINT`, which is where the customer's own door is on the
 *     assignment route — the slide about somebody coming to it.
 *
 * Imported rather than copied, so a slide cannot drift away from the
 * place it is claiming to show.
 */
const CUSTOMER_SLIDES: readonly Slide[] = [
  {
    titleHe: "עיר שלמה של בעלי מקצוע",
    bodyHe: "לא עוד רשימות, דירוגים ומספרי טלפון שצריך להתקשר אליהם לבד. כל תחום וכל בעיה — ברחוב אחד.",
    focus: { u: 0.5, v: 0.45 },
    zoom: 0.42,
  },
  {
    titleHe: "בוחרים דמות ומטיילים",
    bodyHe: "נכנסים לחנויות ורואים מה אפשר להזמין. אפשר גם לדלג ישר לקריאה.",
    focus: WALK_START,
    zoom: 0.72,
  },
  {
    titleHe: "מעכשיו לעכשיו",
    bodyHe: "שולחים קריאה, ומי שפנוי עכשיו ומאושר לעבודה יוצא אליכם. בלי לחכות להצעות מחיר.",
    // The customer's own door, at the bottom of the street. The camera
    // clamps before the plate's edge, so this reads as the end of the
    // road rather than as the edge of a picture.
    focus: CUSTOMER_POINT,
    zoom: 0.95,
  },
  /*
   * Amit: *"להסביר את הביטחון והאימותים, ושמישהו יכול להזמין מקצוען לבת
   * שלו או לסבא שלו — והוא שולט בהצעת המחיר ובתשלום."* Only what the
   * product does: verification per kind of work, the profile and the
   * arrival shown before confirming, the quote approved and paid by the
   * person who sent the request, to whatever address they choose.
   */
  {
    titleHe: "יודעים מי מגיע",
    bodyHe: "כל מקצוען עובר אימות זהות ותעודות לפי סוג העבודה. רואים מי הוא, מתי יגיע ומה המחיר — לפני שמאשרים.",
    focus: CUSTOMER_POINT,
    zoom: 0.8,
  },
  {
    titleHe: "גם בשביל מי שאוהבים",
    bodyHe: "לסבא, לבת בדירה, להורים — שולחים לכתובת שלהם. הם מקבלים הודעה עם מי מגיע וקוד לדלת, ואתם מאשרים ומשלמים מהטלפון שלכם, מכל מקום.",
    focus: WALK_START,
    zoom: 0.6,
  },
];

/**
 * The first measured shopfront spot on the plate.
 *
 * The professional's slides are about HIS shop, so the camera is pointed
 * at one — the same spot `venueSlots` would stand a business on, rather
 * than a coordinate that happened to compose well.
 */
const SHOPFRONT = venueSlots("HOME_URGENT", 1)[0] ?? { u: 0.5, v: 0.55 };

const PRO_SLIDES: readonly Slide[] = [
  {
    titleHe: "הרחוב הזה הוא גם שלך",
    bodyHe: "לכל מקצוען יש חזית משלו בעיר, עם השם שלו עליה. הלקוח לא רואה רשימה — הוא רואה אותך.",
    focus: { u: 0.5, v: 0.45 },
    zoom: 0.42,
  },
  {
    titleHe: "אתה מחליט מתי אתה באוויר",
    bodyHe: "מתחילים משמרת ומפסיקים מתי שרוצים. קריאות מגיעות רק כשאתה מחובר.",
    // His own front, close enough to read the sign over it. The slide is
    // about being open for business; the picture should be the business.
    focus: SHOPFRONT,
    zoom: 0.78,
  },
  {
    titleHe: "רואים את העבודה לפני שמקבלים",
    bodyHe: "רק שירותים שאתה מאושר אליהם, באזור שלך — ומה שהעבודה שווה, כשהסכום ידוע מראש.",
    // Where the work is: the customer's end of the street, which is the
    // place a job actually comes from.
    focus: CUSTOMER_POINT,
    zoom: 0.95,
  },
  {
    titleHe: "המחירים — שלך",
    bodyHe: "אתה קובע: מחיר קבוע, תעריף לשעה או מחיר ביקור ואבחון, מחירון לעבודות, ותוספת לילה ושבת. הלקוח רואה את המחיר שלך לפני שהוא מזמין.",
    focus: SHOPFRONT,
    zoom: 0.6,
  },
];

export interface IntroBodyProps {
  /** Which three. The two sides ask the same questions from opposite ends. */
  side?: "CUSTOMER" | "PRO";
  sources?: WorldAssetSources;
  /** Finished, or skipped — both are the same answer to the caller. */
  onDone?: () => void;
  /** Which of the three is showing, 0-based. See `background`. */
  onSlide?: (index: number) => void;
  /**
   * What to show behind the words.
   *
   * Left out, the painted neighbourhood travels between the three
   * focus points below — which is what the phone apps still do. A host
   * with a real camera passes its own world here instead.
   */
  background?: React.ReactNode;
  /** False holds the city still, for screenshots and tests. */
  animate?: boolean;
  width?: number;
  height?: number;
}

export function IntroBody({
  side = "CUSTOMER",
  sources = EMPTY_ASSET_SOURCES,
  onDone,
  onSlide,
  background,
  animate = true,
  width = 390,
  height = 780,
}: IntroBodyProps) {
  const slides = side === "PRO" ? PRO_SLIDES : CUSTOMER_SLIDES;
  const colors = side === "PRO" ? proTheme.colors : customerDarkTheme.colors;
  const [i, setI] = useState(0);
  /* The host needs to know which sentence is on screen, so it can aim
     a camera at what the sentence is about. */
  useEffect(() => {
    onSlide?.(i);
  }, [i, onSlide]);
  const slide = slides[i]!;
  const last = i === slides.length - 1;

  /*
   * The words fade and lift between slides; the CITY does not cut. The
   * backdrop travels to the next focus on its own timing, so the two
   * halves of the transition are deliberately different — text is a
   * change of subject, the camera is a move through one place.
   */
  const fade = useRef(new Animated.Value(1)).current;
  const next = () => {
    if (last) {
      onDone?.();
      return;
    }
    if (!animate) {
      setI((n) => n + 1);
      return;
    }
    Animated.timing(fade, { toValue: 0, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(
      () => {
        setI((n) => n + 1);
        Animated.timing(fade, {
          toValue: 1,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      }
    );
  };

  const back = () => {
    if (i === 0) return;
    setI((n) => Math.max(0, n - 1));
  };
  /*
   * A SWIPE TURNS THE PAGE.
   *
   * Amit: *"במסכי ההסבר נראה כאילו אפשר לעשות סוויפ שמאלה, אבל בעצם אפשר
   * רק ללחוץ הבא."* The dots say "pages", so the pages turn under a
   * finger. In Hebrew the book opens to the left, so a finger pulled to
   * the RIGHT turns to the next page and one pulled left goes back —
   * Amit, after trying it the other way: *"הסוויפ הפוך, ימינה מעביר
   * שמאלה ולהפך."* "הבא" still works.
   */
  const nav = useRef({ next, back });
  nav.current = { next, back };
  const swipe = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy) * 1.4,
        /* Capture, so a swipe that starts on the words or a button still turns the page. */
        onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy) * 1.4,
        onPanResponderRelease: (_, g) => {
          if (g.dx > 40 || g.vx > 0.5) nav.current.next();
          else if (g.dx < -40 || g.vx < -0.5) nav.current.back();
        },
      }),
    []
  );

  return (
    <View style={[styles.screen, { width, height, backgroundColor: colors.bg }]} {...swipe.panHandlers}>
      {/*
        * THE WORLD BEHIND THE WORDS — AND IT CAN BE THE REAL ONE.
        *
        * Amit: *"שהמצלמה תזוז ותתמקד בעולם שלנו ובמה שרשום — אם רשום
        * עיר שיראו את העיר, אם רשום אווטאר שיראו אווטאר."*
        *
        * These three slides have always travelled over the PAINTED
        * plate, which was right when that was the only world there
        * was: moving a camera rather than swapping a picture is what
        * makes three slides demonstrably one place, and that is the
        * claim they exist to make.
        *
        * There is now a world with a real camera in it. A host that
        * can render one passes it as `background` and tells the slide
        * where to look through `onSlide`; a host that cannot — the two
        * phone apps, until `expo-gl` — gets the painting, unchanged.
        */}
      {background ?? (
        <WorldBackdrop
          width={width}
          height={height}
          sources={sources}
          animate={animate}
          focus={slide.focus}
          zoom={slide.zoom}
        />
      )}

      {/*
        * ONE GRADIENT, NOT TWO PANELS.
        *
        * The first version stacked a band at the top and a taller one at
        * the bottom, and left a hard horizontal line straight across the
        * city where each one ended — visible in the first screenshot,
        * invisible in the code. `WelcomeBody` had already been through
        * exactly this and its note says so; `Scrim` is the shared answer:
        * a little at the very top for a wordmark to sit on, almost
        * nothing through the middle where the world should simply be the
        * world, then deepening to solid behind the words.
        */}
      <Scrim width={width} height={height} />

      <View style={styles.content} pointerEvents="box-none">
        <Animated.View style={{ opacity: fade }}>
          <Text style={styles.title}>{slide.titleHe}</Text>
          <Text style={styles.body}>{slide.bodyHe}</Text>
        </Animated.View>

        {/* Where you are in the three. Three dots, and nothing else. */}
        <View style={styles.dots}>
          {slides.map((s, n) => (
            <View
              key={s.titleHe}
              style={[styles.dot, n === i ? { backgroundColor: colors.action, width: 18 } : null]}
            />
          ))}
        </View>

        <Pressable
          onPress={next}
          accessibilityRole="button"
          accessibilityLabel={last ? "בואו נתחיל" : `הבא — שקופית ${i + 2} מתוך ${slides.length}`}
          style={({ pressed }) => [
            styles.primary,
            { backgroundColor: colors.action },
            pressed && { opacity: 0.9 },
          ]}
        >
          <Text style={styles.primaryText}>{last ? "בואו נתחיל" : "הבא"}</Text>
        </Pressable>

        {/*
          * SKIPPING IS A REAL ANSWER, AND IT IS VISIBLE.
          *
          * The same rule the avatar picker follows: a skip that hides in
          * a corner is mandatory with extra steps. Somebody with a burst
          * pipe is not here to read three slides.
          */}
        {last ? (
          <View style={styles.skipSpacer} />
        ) : (
          <Pressable
            onPress={onDone}
            accessibilityRole="button"
            accessibilityLabel="דילוג על ההסבר"
            style={styles.skip}
          >
            <Text style={[styles.skipText, { color: colors.textSecondary }]}>דלג</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { overflow: "hidden" },
  content: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  title: {
    ...type.hero,
    color: palette.nightText,
    textAlign: "right",
    writingDirection: "rtl",
    // Over a city, even behind a scrim.
    textShadowColor: "rgba(8,6,14,0.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 12,
  },
  body: {
    ...type.body,
    color: palette.nightTextSoft,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: spacing.sm,
    textShadowColor: "rgba(8,6,14,0.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 10,
  },
  dots: { flexDirection: "row-reverse", gap: 6, marginTop: spacing.sm },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(247,243,250,0.34)",
  },
  primary: {
    minHeight: 52,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { ...type.bodyStrong, color: "#0B0918" },
  skip: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  skipText: { ...type.caption, writingDirection: "rtl" },
  skipSpacer: { height: 44 },
});
