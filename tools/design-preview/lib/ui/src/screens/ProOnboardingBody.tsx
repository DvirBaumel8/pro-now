import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { APPROVAL_STEPS_HE, onboardingDocsFor, type OnboardingDoc, type PricingKind } from "@pro-now/demo-types";

import { palette, scale, spacing } from "../theme";
import { matchServicesByText, type ServiceMatchRule } from "../service-match";
import { PinMark, StarMark } from "../components/marks";

/**
 * ---------------------------------------------------------------------
 * JOINING PRO NOW, FOR A PROFESSIONAL
 * ---------------------------------------------------------------------
 * Amit, 2026-09-29: *"לא הכנו טופס הצטרפות… איפה השלב שהוא ממלא פרטים /
 * מקים חנות, מחליט תחומי עניין ומחירים… הכי נח לשימוש, חדשני ומרשים —
 * שכולם ירצו להצטרף."*
 *
 * One question per screen, a bar that fills, nothing asked twice:
 *   0 welcome · 1 what you do (in your own words) · 2 you and your area ·
 *   3 documents (per trade, from the research) · 4 prices (per pricing
 *   kind, and your own lines) · 5 your shop in our street · 6 your photo ·
 *   7 send for approval — work arrives only after PRO NOW approves.
 */

export interface OnboardingService {
  id: string;
  nameHe: string;
  categoryHe: string;
  /** The wider field the category belongs to (pets, vehicle…), for ordering the list. */
  groupId?: string;
  kind: PricingKind;
  /** Example figures in agorot, for the price step's starting values. */
  visitFee?: number | null;
  hourly?: number | null;
  deliveryBase?: number | null;
  perKm?: number | null;
  list?: ReadonlyArray<{ id: string; nameHe: string; amountMinorUnits: number }>;
}

export interface OnboardingResult {
  nameHe: string;
  businessHe: string;
  serviceIds: string[];
  customServicesHe: string[];
  shopNameHe: string;
  brandColor: string;
  logoUri: string | null;
  photoUri: string | null;
  /** He skipped designing the shop — it opens with our defaults, to design later. */
  shopSkipped: boolean;
  city: string;
  radiusKm: number;
  /** What he charges, per service: the visit fee, hourly rate or base fare he set. */
  pricesMinorUnits?: Record<string, number>;
  /** His own price-list lines, per service. */
  priceLines?: Record<string, Array<{ id: string; nameHe: string; amountMinorUnits: number }>>;
  /** The documents he actually uploaded (the rest were skipped, in a demo). */
  uploadedDocIds?: string[];
}

export interface ProOnboardingBodyProps {
  services: readonly OnboardingService[];
  matchRules: ServiceMatchRule[];
  /** Editing an approved shop: the last button saves rather than sends for approval. */
  editing?: boolean;
  /** The trades as pictures: the first way in, for people who would rather not read. */
  fields?: ReadonlyArray<{ id: string; labelHe: string; iconUri: string }>;
  /** The trade's shopfront and its drawn professional, for the shop preview. */
  shopFor: (serviceId: string | null) => { facadeUri: string; characterUri: string };
  /** Opens the device's picker; resolves the chosen file, or null. */
  onPickFile?: () => Promise<{ uri: string; name: string } | null>;
  /** The main colour of a logo, when the host can read pixels. */
  extractColor?: (uri: string) => Promise<string | null>;
  backgroundUri?: string | null;
  /** Our neighbourhood seen from above, under the radius ring. */
  areaMapUri?: string | null;
  /** The trades' drawn professionals, for the welcome's line-up. */
  lineupUris?: readonly string[];
  phoneHe?: string | null;
  onDone: (r: OnboardingResult) => void;
  /** Coming back to edit after sending: start from what was sent. */
  initial?: OnboardingResult | null;
  /** Open at a given step (e.g. 5 to design the shop later). */
  startStep?: number;
  onExit?: () => void;
  width: number;
  height: number;
}

const STEPS = ["ברוכים הבאים", "השירותים שלך", "פרטים ואזור", "מסמכים", "מחירים", "החנות שלך", "התמונה שלך", "שליחה"] as const;
const BRAND_SWATCHES = [
  { hex: "#FF5C38", he: "כתום" }, { hex: "#8B5CF6", he: "סגול" }, { hex: "#2FBF8A", he: "ירוק" }, { hex: "#3B82F6", he: "כחול" },
  { hex: "#F59E0B", he: "ענבר" }, { hex: "#EC4899", he: "ורוד" }, { hex: "#14B8A6", he: "טורקיז" }, { hex: "#E5E7EB", he: "לבן" },
];
const RADII_KM = [5, 10, 15, 25, 40];
/* Israeli cities and towns for the base-city box — facts, not a vendor's data. */
const ISRAEL_CITIES: readonly string[] = [
  "תל אביב", "ירושלים", "חיפה", "ראשון לציון", "פתח תקווה", "אשדוד", "נתניה", "באר שבע", "בני ברק", "חולון",
  "רמת גן", "אשקלון", "רחובות", "בת ים", "בית שמש", "כפר סבא", "הרצליה", "חדרה", "מודיעין", "לוד", "רמלה",
  "רעננה", "הוד השרון", "רהט", "נצרת", "גבעתיים", "קריית גת", "קריית אתא", "קריית ביאליק", "קריית מוצקין",
  "קריית ים", "קריית שמונה", "קריית אונו", "קריית מלאכי", "קריית טבעון", "נהריה", "עכו", "עפולה", "טבריה",
  "צפת", "כרמיאל", "אילת", "דימונה", "ערד", "נתיבות", "שדרות", "אופקים", "יבנה", "נס ציונה", "ראש העין",
  "אור יהודה", "יהוד", "גבעת שמואל", "קריית שמונה", "טירת כרמל", "נשר", "יקנעם", "מעלות תרשיחא", "בית שאן",
  "אלעד", "ביתר עילית", "מודיעין עילית", "אריאל", "מעלה אדומים", "זכרון יעקב", "פרדס חנה כרכור", "אור עקיבא",
  "קיסריה", "רמת השרון", "כפר יונה", "גדרה", "גן יבנה", "קדימה צורן", "טייבה", "אום אל פחם", "שפרעם",
].filter((c, i, all) => all.indexOf(c) === i);
const ils = (minor: number | null | undefined) => (minor ? `₪${Math.round(minor / 100).toLocaleString("en-US")}` : "");
const toMinor = (t: string) => (Number(t.replace(/[^0-9]/g, "")) || 0) * 100;

export function ProOnboardingBody({
  services,
  matchRules,
  fields,
  editing = false,
  shopFor,
  onPickFile,
  extractColor,
  backgroundUri = null,
  areaMapUri: _areaMapUri = null,
  lineupUris = [],
  phoneHe = null,
  onDone,
  onExit,
  initial = null,
  startStep,
  width,
  height,
}: ProOnboardingBodyProps) {
  const [step, setStep] = useState(startStep ?? (initial ? 7 : 0));
  const [fromSummary, setFromSummary] = useState(false);
  const [shopSkipped, setShopSkipped] = useState(initial?.shopSkipped ?? false);
  /* For demonstrations only (Amit, 2026-09-30): documents may wait, and say so. */
  const [docsSkipped, setDocsSkipped] = useState(false);
  /* 1 — what you do */
  const [about, setAbout] = useState("");
  /* What he chose by hand, and what he took off the list we understood. */
  const [manual, setManual] = useState<string[]>(initial?.serviceIds ?? []);
  const [removed, setRemoved] = useState<string[]>([]);
  const [custom, setCustom] = useState<string[]>(initial?.customServicesHe ?? []);
  const [field, setField] = useState<string | null>(null);
  /* 2 — you */
  const [name, setName] = useState(initial?.nameHe ?? "");
  const [business, setBusiness] = useState(initial?.businessHe ?? "");
  const [dealer, setDealer] = useState<"פטור" | "מורשה" | "חברה" | null>(initial ? "מורשה" : null);
  const [city, setCity] = useState(initial?.city ?? "");
  const [radius, setRadius] = useState(initial?.radiusKm ?? 15);
  const cityHits = useMemo(() => {
    const q = city.trim();
    if (q.length < 2 || ISRAEL_CITIES.includes(q)) return [];
    const starts = ISRAEL_CITIES.filter((c) => c.startsWith(q));
    const has = ISRAEL_CITIES.filter((c) => !c.startsWith(q) && c.includes(q));
    return [...starts, ...has].slice(0, 5);
  }, [city]);
  /* 3 — documents */
  const [files, setFiles] = useState<Record<string, { name: string; uri: string }>>({});
  const [numbers, setNumbers] = useState<Record<string, string>>({});
  /* 4 — prices, per service */
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [splitVisit, setSplitVisit] = useState(false);
  const [lines, setLines] = useState<Record<string, Array<{ id: string; nameHe: string; amountMinorUnits: number }>>>({});
  /* 5 — shop */
  const [shopNameTyped, setShopName] = useState<string | null>(initial?.shopNameHe ?? null);
  /* Until he types his own, the sign reads his business name, else his name. */
  const shopName = shopNameTyped ?? (business.trim() || name.trim());
  const [logo, setLogo] = useState<string | null>(initial?.logoUri ?? null);
  const [color, setColor] = useState(initial?.brandColor ?? BRAND_SWATCHES[0]!.hex);
  /* 6 — photo */
  const [photo, setPhoto] = useState<string | null>(initial?.photoUri ?? null);
  const [useCharacter, setUseCharacter] = useState(Boolean(initial) && !initial?.photoUri);

  const byId = useMemo(() => Object.fromEntries(services.map((s) => [s.id, s])), [services]);
  const suggestions = useMemo(() => {
    if (about.trim().length < 3) return [];
    return matchServicesByText(about, matchRules).slice(0, 8).map((m) => m.serviceId).filter((id) => byId[id]);
  }, [about, matchRules, byId, fields]);
  /*
   * WHAT WAS UNDERSTOOD FOLLOWS WHAT IS WRITTEN — NOW, NOT WHILE TYPING.
   *
   * Amit, as a vet: *"רשמתי וטרינר … חייב אותי עדיין לבחור … פתיחת סתימה."*
   * A tick used to stick the moment any half-typed word matched something,
   * and stayed after the words changed. Now the understood services are
   * worked out from the text as it stands; only what he picks by hand, or
   * takes off by hand, is remembered.
   */
  /*
   * COMPLETING THE WORD AS HE TYPES IT.
   *
   * Amit: *"שאני מתחיל לרשום שם של מקצוע או שירות — ישלים אותי לבד."* The
   * matcher needs whole words; this looks at the word being typed and offers
   * every service whose name, trade or keywords start with it — "נג" offers
   * נגרות, "מז" offers the air-conditioner. A tap adds it.
   */
  const completions = useMemo(() => {
    const last = about.trim().split(/\s+/).pop() ?? "";
    if (last.length < 2) return [];
    const hits: Array<{ id: string; rank: number }> = [];
    for (const r of matchRules) {
      const x = byId[r.serviceId];
      if (!x) continue;
      const name = x.nameHe.split(/\s+/).some((w) => w.startsWith(last));
      const cat = x.categoryHe.split(/\s+/).some((w) => w.startsWith(last));
      /* Two letters match names only; keywords join from the third, or "גר" offers a doctor (גרון). */
      const kw = last.length >= 3 && r.keywords.some((k) => k.split(/\s+/).some((w) => w.startsWith(last)));
      /* A trade's own word first: "שיפ" → the renovation services, then the rest. */
      const field = (fields ?? []).some((f) => f.id === x.groupId && f.labelHe.split(/\s+/).some((w) => w.startsWith(last)));
      if (field || name || cat || kw) hits.push({ id: x.id, rank: field ? -1 : name ? 0 : cat ? 1 : 2 });
    }
    /* What he already has is filtered where the list is drawn (`picked` is declared further down). */
    return hits.sort((a, b) => a.rank - b.rank).slice(0, 8).map((h) => h.id);
  }, [about, matchRules, byId]);
  /*
   * …AND ONCE UNDERSTOOD, IT STAYS.
   *
   * Amit, 2026-10-01: *"כשהוספתי שיש נעלם הנגרות — חייב לשמור על כל
   * המקצועות."* Following the text meant that writing anything else wiped
   * what had been found — and with nothing left he was dropped into the
   * sample plumber. So what the box understands is kept a moment after he
   * stops typing (long enough not to keep a half-typed word), and leaves only
   * when he takes it off with ×.
   */
  useEffect(() => {
    const fresh = suggestions.filter((id) => !removed.includes(id));
    if (fresh.length === 0) return;
    const t = setTimeout(() => setManual((m) => [...new Set([...m, ...fresh])]), 1100);
    return () => clearTimeout(t);
  }, [suggestions, removed]);
  const picked = useMemo(
    () => [...new Set([...manual, ...suggestions.filter((id) => !removed.includes(id))])],
    [suggestions, removed, manual]
  );
  const unpick = (id: string) => {
    setManual((m) => m.filter((x) => x !== id));
    setRemoved((r) => [...new Set([...r, id])]);
  };
  /* "הוספה": keep what was understood now, or add the words as a new service; then the box is free for the next one. */
  const commitTyped = () => {
    const fresh = suggestions.filter((id) => !removed.includes(id));
    if (fresh.length) setManual((m) => [...new Set([...m, ...fresh])]);
    else if (about.trim().length >= 2) addCustom(about.trim());
    setAbout("");
  };
  const addPick = (id: string) => {
    setManual((m) => [...new Set([...m, id])]);
    setRemoved((r) => r.filter((x) => x !== id));
  };
  /* "שירות חדש" only when it really is new: a trade we have is added as itself. */
  const addCustom = (t: string) => {
    const known = matchServicesByText(t, matchRules).map((m) => m.serviceId).filter((id) => byId[id]);
    if (known.length) known.forEach(addPick);
    else setCustom((p) => [...new Set([...p, t])]);
  };

  const visitIds = useMemo(() => picked.filter((id) => byId[id]?.kind === "VISIT"), [picked, byId]);
  const docs: OnboardingDoc[] = useMemo(() => onboardingDocsFor(picked), [picked]);
  const firstTrade = picked[0] ?? null;
  const shop = shopFor(firstTrade);

  /* Every price he offers must be a real number: fees, rates and each list line with a name. */
  const pricesMissing = picked.reduce((n, id) => {
    const x = byId[id];
    if (!x) return n;
    if (x.kind === "VISIT") return n + ((splitVisit ? prices[id] ?? x.visitFee : prices.__visit ?? byId[visitIds[0]!]?.visitFee) ? 0 : 1);
    if (x.kind === "HOURLY") return n + ((prices[id] ?? x.hourly) ? 0 : 1);
    if (x.kind === "DISTANCE") return n + ((prices[id] ?? x.deliveryBase) ? 0 : 1);
    if (x.kind === "LIST") {
      const rows = lines[id] ?? x.list ?? [];
      return n + (rows.length === 0 ? 1 : rows.filter((r) => !r.nameHe.trim() || !r.amountMinorUnits).length);
    }
    return n;
  }, 0);
  const mustDocs = docs.filter((x) => x.level !== "RECOMMENDED" && !x.whenHe);
  const mustLeft = mustDocs.filter((x) => !files[x.id]).length;
  const canNext = [
    true,
    picked.length + custom.length > 0,
    name.trim().length > 1 && Boolean(dealer) && city.trim().length > 1,
    mustLeft === 0 || docsSkipped,
    pricesMissing === 0,
    shopName.trim().length > 0,
    Boolean(photo) || useCharacter,
    true,
  ][step];
  const whyNot = [
    "",
    "חסר שירות",
    "חסרים שם, סוג עוסק ועיר בסיס",
    mustLeft === 1 ? "עוד מסמך חובה אחד" : `עוד ${mustLeft} מסמכי חובה`,
    pricesMissing === 1 ? "חסר מחיר אחד" : `חסרים ${pricesMissing} מחירים`,
    "חסר שם לשלט",
    "חסרה תמונה",
    "",
  ][step];

  /* The number each service will be charged at — the same rule the prices step checks. */
  const priceOf = () =>
    Object.fromEntries(
      picked
        .map((id) => {
          const x = byId[id];
          const v =
            x?.kind === "VISIT" ? (splitVisit ? prices[id] ?? x.visitFee : prices.__visit ?? byId[visitIds[0]!]?.visitFee)
            : x?.kind === "HOURLY" ? prices[id] ?? x.hourly
            : x?.kind === "DISTANCE" ? prices[id] ?? x.deliveryBase
            : x?.kind === "LIST" ? (lines[id] ?? x.list ?? [])[0]?.amountMinorUnits
            : undefined;
          return [id, v] as const;
        })
        .filter((e): e is readonly [string, number] => typeof e[1] === "number")
    );
  const pick = async (key: string) => {
    const f = await onPickFile?.();
    if (!f) return null;
    setFiles((cur) => ({ ...cur, [key]: f }));
    return f;
  };

  const progress = step / (STEPS.length - 1);
  /* The welcome's city drifts, slowly — alive, never busy. */
  const drift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 20000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 20000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    a.start();
    return () => a.stop();
  }, [drift]);
  const Dealer = ({ v }: { v: "פטור" | "מורשה" | "חברה" }) => (
    <Pressable onPress={() => setDealer(v)} accessibilityRole="radio" accessibilityState={{ checked: dealer === v }} style={[s.chip, dealer === v && s.chipOn]}>
      <Text style={[s.chipText, dealer === v && s.chipTextOn]}>{v === "חברה" ? "חברה בע״מ" : `עוסק ${v}`}</Text>
    </Pressable>
  );

  const body = (() => {
    switch (step) {
      case 0:
        return (
          <View style={s.hero}>
            <Text style={s.heroKicker}>PRO NOW לבעלי מקצוע</Text>
            <Text style={s.heroTitle}>העסק שלך,{"\n"}ברחוב של כולם.</Text>
            <Text style={s.heroSub}>בערך 5 דקות, והחנות שלך עומדת ברחוב שלנו — עם השם שלך, הצבעים שלך והמחירים שלך.</Text>
            {lineupUris.length > 0 ? (
              <View style={s.lineup} accessibilityElementsHidden>
                {lineupUris.slice(0, 5).map((u, i) => (
                  <Image key={u} source={{ uri: u }} style={[s.lineupImg, { transform: [{ translateY: i % 2 ? 6 : 0 }] }]} resizeMode="contain" />
                ))}
              </View>
            ) : null}
            {[
              ["pin", "קריאות לידך, עכשיו", "עובדים מתי שנוח. הקריאות לפי המיקום."],
              ["₪", "המחירים שלך", "הסכום מוצג לפני שמאשרים קריאה"],
              ["star", "חנות משלך ברחוב", "לוגו, צבעים ושלט ניאון — לקוחות רואים אותך"],
            ].map(([g, t, sub]) => (
              <View key={t} style={s.benefit}>
                <View style={s.benefitGlyph}>
                  {g === "pin" ? <PinMark size={20} color="#fff" /> : g === "star" ? <StarMark size={20} color="#fff" /> : <Text style={s.benefitGlyphText}>{g}</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.benefitTitle}>{t}</Text>
                  <Text style={s.benefitSub}>{sub}</Text>
                </View>
              </View>
            ))}
          </View>
        );
      case 1: {
        /*
         * --------------------------------------------------------------------
         * ONE BOX THAT UNDERSTANDS; THE TRADES AS OUR CHARACTERS.
         *
         * Amit: free text that finds the trade by itself is the main way
         * ("שיזהה כל מילה מתוך ה־47"), with "הוספה" beside it; under it the
         * trades as our drawn characters, like the customer's side. What he
         * has chosen is one clear list, "השירותים שלי", each with × to
         * remove — pressing a row never makes it vanish.
         * --------------------------------------------------------------------
         */
        const f = fields?.find((x) => x.id === field) ?? null;
        const inField = f ? services.filter((x) => x.groupId === f.id && !picked.includes(x.id)) : [];
        return (
          <>
            <Text style={s.h1}>מה המקצוע שלך?</Text>
            <Text style={s.lead}>כותבים במילים שלך — נזהה לבד.</Text>
            <View style={s.row}>
              <TextInput
                value={about}
                onChangeText={setAbout}
                onSubmitEditing={commitTyped}
                placeholder="למשל: נגר · וטרינר · מנקה"
                placeholderTextColor="rgba(247,243,250,0.48)"
                accessibilityLabel="תיאור חופשי של העבודה שלך"
                style={[s.input, s.bigInput, { flex: 1, minWidth: 0, width: 0 }]}
                textAlign="right"
                returnKeyType="done"
              />
              <Pressable onPress={commitTyped} disabled={!about.trim()} accessibilityRole="button" accessibilityState={{ disabled: !about.trim() }} style={[s.addBtn, s.addBtnBig, !about.trim() && { opacity: 0.4 }]}>
                <Text style={s.addBtnText}>הוספה</Text>
              </Pressable>
            </View>
            {completions.filter((id) => !picked.includes(id)).length > 0 ? (
              <View style={s.cityList}>
                {completions.filter((id) => !picked.includes(id)).slice(0, 5).map((id) => (
                  <Pressable key={id} onPress={() => { addPick(id); setAbout(""); }} accessibilityRole="button" accessibilityLabel={`הוספת ${byId[id]?.nameHe ?? ""}`} style={[s.cityRow, { flexDirection: "row-reverse", alignItems: "center", gap: 10 }]}>
                    <Text style={[s.pickTick, { color: "#2FBF8A" }]}>+</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.cityText}>{byId[id]?.nameHe}</Text>
                      <Text style={s.pickCat}>{byId[id]?.categoryHe}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : null}
            {about.trim().length >= 3 && suggestions.length === 0 && completions.length === 0 ? (
              <Text style={s.nomatchText}>{`לא מצאנו את ״${about.trim().slice(0, 30)}״ — ״הוספה״ תוסיף אותו כשירות חדש, או בוחרים תחום למטה.`}</Text>
            ) : null}
            {picked.length + custom.length > 0 ? (
              <>
                <Text style={s.section}>השירותים שלי</Text>
                {picked.map((id) => (
                  <RiseRow key={id}>
                    <View style={[s.pickRow, s.pickRowOn]}>
                      <View style={[s.pickBox, s.pickBoxOn]}><Text style={s.pickTick}>✓</Text></View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.pickName}>{byId[id]?.nameHe}</Text>
                        <Text style={s.pickCat}>{byId[id]?.categoryHe}</Text>
                      </View>
                      <Pressable onPress={() => unpick(id)} accessibilityRole="button" accessibilityLabel={`הסרת ${byId[id]?.nameHe ?? ""}`} style={s.pickX}>
                        <Text style={s.svcX}>×</Text>
                      </Pressable>
                    </View>
                  </RiseRow>
                ))}
                {custom.map((c) => (
                  <View key={c} style={[s.pickRow, s.pickRowOn]}>
                    <View style={[s.pickBox, s.pickBoxOn]}><Text style={s.pickTick}>✓</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.pickName}>{c}</Text>
                      <Text style={s.pickCat}>שירות חדש · נבדוק</Text>
                    </View>
                    <Pressable onPress={() => setCustom((p) => p.filter((x) => x !== c))} accessibilityRole="button" accessibilityLabel={`הסרת ${c}`} style={s.pickX}>
                      <Text style={s.svcX}>×</Text>
                    </Pressable>
                  </View>
                ))}
              </>
            ) : null}
            {fields && fields.length > 0 ? (
              <>
                <Text style={s.section}>{picked.length + custom.length > 0 ? "עוד תחום?" : "או בוחרים תחום"}</Text>
                <View style={s.fieldGrid}>
                  {fields.map((x) => {
                    const n = picked.filter((id) => byId[id]?.groupId === x.id).length;
                    const onF = field === x.id;
                    return (
                      <Pressable key={x.id} onPress={() => setField(onF ? null : x.id)} accessibilityRole="button" accessibilityState={{ expanded: onF }} accessibilityLabel={x.labelHe} style={({ pressed }) => [s.fieldTile, (n > 0 || onF) && s.fieldTileOn, pressed && { transform: [{ scale: 0.97 }] }]}>
                        <Image source={{ uri: x.iconUri }} style={s.fieldImg} resizeMode="contain" />
                        <Text style={s.fieldLabel} numberOfLines={2}>{x.labelHe}</Text>
                        {n > 0 ? <View style={s.fieldBadge}><Text style={s.fieldBadgeText}>✓ {n}</Text></View> : null}
                      </Pressable>
                    );
                  })}
                </View>
                {f ? (
                  <>
                    <Text style={s.section}>{`${f.labelHe} · מסמנים מה עושים`}</Text>
                    {inField.length === 0 ? <Text style={s.pickCat}>כל השירותים בתחום כבר אצלך.</Text> : null}
                    {inField.map((x) => (
                      <Pressable key={x.id} onPress={() => addPick(x.id)} accessibilityRole="button" accessibilityLabel={`הוספת ${x.nameHe}`} style={s.pickRow}>
                        <View style={s.pickBox}><Text style={[s.pickTick, { color: "rgba(247,243,250,0.7)" }]}>+</Text></View>
                        <Text style={[s.pickName, { flex: 1 }]}>{x.nameHe}</Text>
                      </Pressable>
                    ))}
                  </>
                ) : null}
              </>
            ) : null}
          </>
        );
      }
      case 2:
        return (
          <>
            <Text style={s.h1}>קצת עליך</Text>
            <Text style={s.label}>שם מלא</Text>
            <TextInput value={name} onChangeText={setName} placeholder="השם שלך" placeholderTextColor="rgba(247,243,250,0.48)" style={s.input} textAlign="right" accessibilityLabel="שם מלא" />
            <Text style={s.label}>שם העסק (לא חובה)</Text>
            <TextInput value={business} onChangeText={setBusiness} placeholder="יופיע על השלט" placeholderTextColor="rgba(247,243,250,0.48)" style={s.input} textAlign="right" accessibilityLabel="שם העסק" />
            <Text style={s.label}>סוג עוסק</Text>
            <View style={s.row}><Dealer v="פטור" /><Dealer v="מורשה" /><Dealer v="חברה" /></View>
            {phoneHe ? <Text style={s.hint}>הטלפון שלך: {phoneHe} · אומת בכניסה</Text> : null}
            <Text style={s.h2}>אזור עבודה</Text>
            <Text style={s.label}>עיר הבסיס</Text>
            <TextInput value={city} onChangeText={setCity} placeholder="למשל: רמת גן" placeholderTextColor="rgba(247,243,250,0.48)" style={s.input} textAlign="right" accessibilityLabel="עיר הבסיס" />
            {/* Amit: "אם אני רושם קריית — שיזהה לבד מתוך רשימה". From a list of
                Israeli cities kept in the app; a maps vendor is not chosen yet. */}
            {cityHits.length > 0 ? (
              <View style={s.cityList}>
                {cityHits.map((c) => (
                  <Pressable key={c} onPress={() => setCity(c)} accessibilityRole="button" style={s.cityRow}>
                    <Text style={s.cityText}>{c}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            <Text style={s.label}>עד כמה רחוק</Text>
            <View style={s.radiiRow}>
              {RADII_KM.map((km) => (
                <Pressable key={km} onPress={() => setRadius(km)} style={[s.chip, s.radiusChip, radius === km && s.chipOn]} accessibilityRole="radio" accessibilityState={{ checked: radius === km }}>
                  <Text style={[s.chipText, radius === km && s.chipTextOn]}>{km} ק״מ</Text>
                </Pressable>
              ))}
            </View>
            <View style={s.radar}>
              {/* A drawn area, not the old neighbourhood picture (Amit: "ישנה ולא
                  קשורה"): the distances as quiet rings, his chosen one in coral. */}
              {[0.9, 0.62, 0.36].map((k) => (
                <View key={k} style={[s.radarGuide, { width: 300 * k, height: 300 * k, borderRadius: 150 * k }]} />
              ))}
              <View style={s.radarAxisH} />
              <View style={s.radarAxisV} />
              <RadiusRing size={60 + radius * 4} />
              <View style={s.radarDot} />
              <Text style={s.radarText}>{city.trim() || "הבסיס שלך"} · {radius} ק״מ</Text>
            </View>
            <Text style={s.hint}>במשמרת, הקריאות מגיעות לפי המיקום שלך באותו רגע.</Text>
          </>
        );
      case 3:
        return (
          <>
            <Text style={s.h1}>המסמכים שלך</Text>
            <Text style={s.lead}>רק מה שצריך לשירותים שבחרת. מצלמים או מעלים — אנחנו בודקים.</Text>
            <Text style={s.counter}>{mustDocs.length - mustLeft} מתוך {mustDocs.length} מסמכי חובה</Text>
            {docs.map((doc) => {
              const f = files[doc.id];
              return (
                <View key={doc.id} style={[s.doc, f && s.docDone]}>
                  <View style={s.docHead}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.docName}>{doc.nameHe}</Text>
                      {doc.level === "LAW" ? <Text style={s.docLaw}>{doc.whenHe ? `לפי חוק · ${doc.whenHe}` : "לפי חוק"}</Text> : null}
                      <Text style={s.docWhy}>{doc.checkHe}</Text>
                    </View>
                    <View style={[s.level, doc.level === "RECOMMENDED" ? s.levelRec : doc.whenHe ? s.levelRec : s.levelLaw]}>
                      <Text style={s.levelText}>{doc.level === "RECOMMENDED" ? "מומלץ" : doc.whenHe ? "לפי הצורך" : "חובה"}</Text>
                    </View>
                  </View>
                  {doc.numberLabelHe ? (
                    <TextInput
                      value={numbers[doc.id] ?? ""}
                      onChangeText={(t) => setNumbers((n) => ({ ...n, [doc.id]: t }))}
                      placeholder={doc.numberLabelHe}
                      placeholderTextColor="rgba(247,243,250,0.48)"
                      style={[s.input, { marginTop: 8 }]}
                      textAlign="right"
                      accessibilityLabel={`${doc.nameHe} — ${doc.numberLabelHe}`}
                    />
                  ) : null}
                  <Pressable onPress={() => pick(doc.id)} style={[s.upload, f && s.uploadDone]} accessibilityRole="button" accessibilityLabel={f ? `${doc.nameHe} הועלה — החלפה` : `העלאת ${doc.nameHe}`}>
                    {f ? <Image source={{ uri: f.uri }} style={s.thumb} /> : null}
                    <Text style={[s.uploadText, f && { color: "#2FBF8A" }]}>{f ? "✓ הועלה · החלפה" : doc.id === "SELFIE" ? "צילום עכשיו" : "צילום או העלאה"}</Text>
                  </Pressable>
                </View>
              );
            })}
            <Text style={s.fine}>לפי החוק לא נבקש ממך תעודת יושר. את הרישיונות אנחנו בודקים מול המאגרים הממשלתיים.</Text>
          </>
        );
      case 4:
        return (
          <>
            {/* Amit: "מה זה מילאנו מחירים לדוגמה? איפה אני בוחר?" — the
                question is his, the numbers in the boxes are a starting point. */}
            <Text style={s.h1}>כמה אתה לוקח?</Text>
            <Text style={s.lead}>לוחצים על מחיר ומשנים. מה שרשום — מחיר מקובל בשוק.</Text>
            {visitIds.length > 0 ? (
              <View style={s.priceCard}>
                <Text style={s.priceName}>דמי ביקור ובדיקה</Text>
                <Text style={s.priceKind}>{visitIds.map((id) => byId[id]?.nameHe).join(" · ")}</Text>
                <MoneyField value={prices.__visit ?? byId[visitIds[0]!]?.visitFee ?? 0} onChange={(t) => setPrices((p) => ({ ...p, __visit: toMinor(t) }))} />
                <View style={s.previewChip}>
                  <Text style={s.previewText}>הלקוח יראה: ״דמי ביקור {ils(prices.__visit ?? byId[visitIds[0]!]?.visitFee)} · את העבודה עצמה סוגרים ישירות איתך״</Text>
                </View>
                {visitIds.length > 1 ? (
                  <Pressable onPress={() => setSplitVisit((v) => !v)} accessibilityRole="button" style={s.linkRow}>
                    <Text style={s.link}>{splitVisit ? "מחיר אחד לכולם" : "מחיר שונה לשירות מסוים"}</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
            {picked.filter((id) => splitVisit || byId[id]?.kind !== "VISIT").map((id) => {
              const x = byId[id];
              if (!x) return null;
              const val = prices[id];
              const set = (t: string) => setPrices((p) => ({ ...p, [id]: toMinor(t) }));
              const rows = lines[id] ?? x.list?.map((r) => ({ ...r })) ?? [];
              const setRows = (next: typeof rows) => setLines((l) => ({ ...l, [id]: next }));
              return (
                <View key={id} style={s.priceCard}>
                  <Text style={s.priceName}>{x.nameHe}</Text>
                  {x.kind === "VISIT" ? (
                    <>
                      <Text style={s.priceKind}>דמי ביקור ובדיקה — זה מה שנגבה באפליקציה</Text>
                      <MoneyField value={val ?? x.visitFee ?? 0} onChange={set} />
                      <View style={s.previewChip}><Text style={s.previewText}>הלקוח יראה: ״דמי ביקור {ils(val ?? x.visitFee)} · את העבודה עצמה סוגרים ישירות איתך״</Text></View>
                    </>
                  ) : x.kind === "HOURLY" ? (
                    <>
                      <Text style={s.priceKind}>לפי שעה</Text>
                      <MoneyField value={val ?? x.hourly ?? 0} onChange={set} suffixHe="לשעה" />
                      <View style={s.previewChip}><Text style={s.previewText}>הלקוח יראה: ״{ils(val ?? x.hourly)} לשעה · לפי זמן בפועל״</Text></View>
                    </>
                  ) : x.kind === "DISTANCE" ? (
                    <>
                      <Text style={s.priceKind}>לפי מרחק — מחיר בסיס + לכל ק״מ</Text>
                      <MoneyField value={val ?? x.deliveryBase ?? 0} onChange={set} suffixHe="בסיס" />
                      <Text style={s.preview}>+ {ils(x.perKm)} לכל ק״מ</Text>
                    </>
                  ) : x.kind === "QUOTE_FIRST" ? (
                    <>
                      <Text style={s.priceKind}>הצעת מחיר לכל קריאה, לפני יציאה</Text>
                    </>
                  ) : (
                    <>
                      <Text style={s.priceKind}>המחירון שלך — הלקוח בוחר מה להזמין</Text>
                      {rows.map((r, i) => (
                        <View key={r.id} style={s.listRow}>
                          <TextInput value={r.nameHe} onChangeText={(t) => setRows(rows.map((q, j) => (j === i ? { ...q, nameHe: t } : q)))} style={[s.input, { flex: 1, minWidth: 0, width: 0 }]} textAlign="right" accessibilityLabel="שם העבודה" />
                          <MoneyField small value={r.amountMinorUnits} onChange={(t) => setRows(rows.map((q, j) => (j === i ? { ...q, amountMinorUnits: toMinor(t) } : q)))} />
                          <Pressable onPress={() => setRows(rows.filter((_, j) => j !== i))} accessibilityRole="button" accessibilityLabel="הסרת שורה" style={s.remove}>
                            <Text style={s.removeText}>×</Text>
                          </Pressable>
                        </View>
                      ))}
                      <Pressable onPress={() => setRows([...rows, { id: `c${Date.now()}`, nameHe: "", amountMinorUnits: 0 }])} accessibilityRole="button" style={s.linkRow}>
                        <Text style={s.link}>+ עבודה שלא ברשימה</Text>
                      </Pressable>
                    </>
                  )}
                </View>
              );
            })}
            {custom.length > 0 ? <Text style={s.fine}>לשירותים החדשים ({custom.join(", ")}) נקבע מחירים יחד אחרי האישור.</Text> : null}
          </>
        );
      case 5:
        return (
          <>
            <Text style={s.h1}>החנות שלך ברחוב</Text>
            <Text style={s.lead}>ככה לקוחות יראו אותך — בעיר שלנו ובכרטיס שלך.</Text>
            <View style={s.shopStage}>
              <Image source={{ uri: shop.facadeUri }} style={s.facade} resizeMode="contain" />
              <View style={[s.sign, { borderColor: color, shadowColor: color }]}>
                {logo ? <Image source={{ uri: logo }} style={s.signLogo} /> : null}
                <Text style={[s.signText, { color: "#fff", ...({ textShadow: `0 0 10px ${color}, 0 0 22px ${color}` } as object) }]} numberOfLines={1}>
                  {shopName || "השם שלך"}
                </Text>
              </View>
              <View style={[s.glow, { backgroundColor: color }]} />
            </View>
            <Text style={s.label}>השם על השלט</Text>
            <TextInput value={shopName} onChangeText={(t) => { setShopName(t); setShopSkipped(false); }} maxLength={22} style={s.input} textAlign="right" accessibilityLabel="השם על השלט" />
            <Text style={s.label}>לוגו (לא חובה)</Text>
            <Pressable
              onPress={async () => {
                const f = await pick("LOGO");
                if (!f) return;
                setLogo(f.uri);
                const c = await extractColor?.(f.uri);
                if (c) setColor(c);
              }}
              accessibilityRole="button"
              accessibilityLabel="העלאת לוגו"
              style={s.upload}
            >
              {logo ? <Image source={{ uri: logo }} style={s.thumb} /> : null}
              <Text style={s.uploadText}>{logo ? "✓ הלוגו עלה — הצבע נלקח ממנו" : "העלאת לוגו · ניקח ממנו את צבע המותג"}</Text>
            </Pressable>
            <Text style={s.label}>צבע המותג</Text>
            <View style={s.row}>
              {BRAND_SWATCHES.map((c) => (
                <Pressable key={c.hex} onPress={() => setColor(c.hex)} accessibilityRole="radio" accessibilityState={{ checked: color === c.hex }} accessibilityLabel={`צבע ${c.he}`} style={[s.swatch, { backgroundColor: c.hex }, color === c.hex && s.swatchOn]} />
              ))}
            </View>
          </>
        );
      case 6:
        return (
          <>
            <Text style={s.h1}>התמונה שלך</Text>
            <Text style={s.lead}>לקוחות סומכים על מי שהם רואים. תמונה אמיתית — או הדמות שלך מהעיר.</Text>
            <View style={s.row}>
              {files.SELFIE && !photo ? (
                <Pressable onPress={() => { setPhoto(files.SELFIE!.uri); setUseCharacter(false); }} accessibilityRole="radio" accessibilityState={{ checked: false }} style={s.photoOpt}>
                  <Image source={{ uri: files.SELFIE.uri }} style={s.photoImg} />
                  <Text style={s.photoLabel}>התמונה שצילמת קודם</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={async () => {
                  const f = await pick("PHOTO");
                  if (f) {
                    setPhoto(f.uri);
                    setUseCharacter(false);
                  }
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked: Boolean(photo) && !useCharacter }}
                accessibilityLabel="סלפי או תמונה"
                style={[s.photoOpt, Boolean(photo) && !useCharacter && s.photoOptOn]}
              >
                {photo ? <Image source={{ uri: photo }} style={s.photoImg} /> : <Text style={s.photoPlus}>+</Text>}
                <Text style={s.photoLabel}>{photo ? "התמונה שלך" : "סלפי או תמונה"}</Text>
              </Pressable>
              <Pressable onPress={() => setUseCharacter(true)} accessibilityRole="radio" accessibilityLabel="הדמות של המקצוע" accessibilityState={{ checked: useCharacter }} style={[s.photoOpt, useCharacter && s.photoOptOn]}>
                <Image source={{ uri: shop.characterUri }} style={s.photoImg} resizeMode="contain" />
                <Text style={s.photoLabel}>הדמות (במקום תמונה)</Text>
              </Pressable>
            </View>
          </>
        );
      default:
        return (
          <>
            <Text style={s.h1}>הכל מוכן</Text>
            <Text style={s.lead}>ככה יראה אותך לקוח:</Text>
            <View style={[s.card, { borderColor: color }]}>
              <Image source={{ uri: useCharacter || !photo ? shop.characterUri : photo }} style={s.cardPhoto} />
              <View style={{ flex: 1 }}>
                <Text style={s.cardName}>{name || "השם שלך"}</Text>
                <Text style={s.cardMeta}>{shopName} · חדש ב־PRO NOW</Text>
                <Text style={s.cardMeta}>{picked.map((id) => byId[id]?.nameHe).filter(Boolean).slice(0, 2).join(" · ")}</Text>
              </View>
              {logo ? <Image source={{ uri: logo }} style={s.cardLogo} /> : <View style={[s.cardLogo, { backgroundColor: color }]} />}
            </View>
            <Text style={s.h2}>מה נשלח</Text>
            {[
              { t: "שירותים", v: `${picked.length + custom.length}`, to: 1 },
              { t: "אזור", v: `${city || "—"} · ${radius} ק״מ`, to: 2 },
              { t: "מסמכים", v: docsSkipped && mustLeft > 0 ? `${mustDocs.length - mustLeft}/${mustDocs.length} · יושלם אחר כך` : `${mustDocs.length - mustLeft}/${mustDocs.length} חובה${Object.keys(files).filter((k) => docs.some((d) => d.id === k && d.level === "RECOMMENDED")).length ? " · + מומלצים" : ""}`, to: 3 },
              { t: "מחירים", v: visitIds.length ? `דמי ביקור ${ils(prices.__visit ?? byId[visitIds[0]!]?.visitFee)}` : "לפי המחירון שלך", to: 4 },
              { t: "החנות", v: shopSkipped ? `${shopName} · עיצוב ברירת מחדל, אפשר אחר כך` : shopName, to: 5 },
            ].map((r) => (
              <Pressable key={r.t} onPress={() => { setFromSummary(true); setStep(r.to); }} accessibilityRole="button" accessibilityLabel={`עריכת ${r.t}`} style={s.sumRow}>
                <Text style={s.sumLabel}>{r.t}</Text>
                <Text style={s.sumValue} numberOfLines={1}>{r.v}</Text>
                <Text style={s.sumEdit}>עריכה</Text>
              </Pressable>
            ))}
            <Text style={s.h2}>מה קורה אחרי השליחה</Text>
            {APPROVAL_STEPS_HE.map((t, i) => (
              <View key={t} style={s.approval}>
                <View style={s.approvalDot}>
                  <Text style={s.approvalNum}>{i + 1}</Text>
                </View>
                <Text style={s.approvalText}>{t}</Text>
              </View>
            ))}
            <Text style={s.fine}>נעדכן אותך בהודעה ברגע שהחשבון מאושר. עד אז אפשר לערוך הכל.</Text>
          </>
        );
    }
  })();

  return (
    <View style={[s.screen, { width, height }]}>
      {backgroundUri && step === 0 ? (
        <Animated.Image source={{ uri: backgroundUri }} style={[StyleSheet.absoluteFill, { opacity: 0.8, transform: [{ scale: drift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) }] }]} resizeMode="cover" />
      ) : null}
      {step === 0 ? <View style={s.heroShade} /> : null}
      <View style={s.top}>
        <Pressable onPress={() => (step === 0 ? onExit?.() : setStep((n) => n - 1))} accessibilityRole="button" accessibilityLabel="חזרה" hitSlop={10} style={s.back}>
          <Text style={s.backText}>›</Text>
        </Pressable>
        {step > 0 ? (
          <View style={{ flex: 1 }}>
            <Text style={s.stepLabel}>{step} מתוך {STEPS.length - 1} · {STEPS[step]}</Text>
            <View style={s.bar}><View style={[s.barFill, { width: `${Math.max(4, progress * 100)}%` }]} /></View>
          </View>
        ) : null}
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {/* Every step comes in, rather than cutting (Amit: "שיכנס באפקט"). */}
        <RiseRow key={step}>{body}</RiseRow>
      </ScrollView>
      <View style={s.foot}>
        {/* The shop's design may wait (Amit, 2026-09-30); everything else
            required stays required — prices included. */}
        {/* Documents and the photo may be skipped too — for demonstrations
            only, until the app runs for real (Amit, 2026-09-30). The
            summary says they were skipped; nothing pretends they arrived. */}
        {(step === 3 && mustLeft > 0) || (step === 6 && !photo && !useCharacter) ? (
          <Pressable
            onPress={() => {
              if (step === 3) setDocsSkipped(true);
              else setUseCharacter(true);
              setStep((n) => n + 1);
            }}
            accessibilityRole="button"
            accessibilityLabel="אחר כך"
            style={s.skip}
          >
            <Text style={s.skipText}>אחר כך</Text>
          </Pressable>
        ) : null}
        {step === 5 ? (
          <Pressable
            onPress={() => {
              setShopSkipped(true);
              setStep((n) => n + 1);
            }}
            accessibilityRole="button"
            style={s.skip}
          >
            <Text style={s.skipText}>אעצב אחר כך</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => {
            if (!canNext) return;
            if (step === STEPS.length - 1) {
              onDone({ nameHe: name, businessHe: business, serviceIds: picked, customServicesHe: custom, shopNameHe: shopName, brandColor: color, shopSkipped, logoUri: logo, photoUri: useCharacter ? null : photo ?? files.SELFIE?.uri ?? null, city, radiusKm: radius, pricesMinorUnits: priceOf(), uploadedDocIds: Object.keys(files), priceLines: Object.fromEntries(picked.filter((id) => byId[id]?.kind === "LIST").map((id) => [id, [...(lines[id] ?? byId[id]?.list ?? [])]])) });
              return;
            }
            /* Editing one thing from the summary returns to the summary —
               not through every step after it (Amit: "מחזיר לשלב הראשון"). */
            if (fromSummary) {
              setFromSummary(false);
              setStep(STEPS.length - 1);
              return;
            }
            setStep((n) => n + 1);
          }}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canNext }}
          style={({ pressed }) => [s.cta, !canNext && s.ctaOff, pressed && canNext && { transform: [{ scale: 0.98 }] }]}
        >
          <Text style={s.ctaText}>{!canNext && whyNot ? whyNot : step === 0 ? "מתחילים" : step === STEPS.length - 1 ? (editing ? "שמירת השינויים" : "שליחה לאישור PRO NOW") : fromSummary ? "שמירה" : "המשך"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

/* The work radius, growing as it changes. */
function RadiusRing({ size }: { size: number }) {
  const v = useRef(new Animated.Value(size)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: size, duration: 240, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
  }, [size, v]);
  return <Animated.View style={[s.radarRing, { width: v, height: v, borderRadius: Animated.divide(v, 2) }]} />;
}

/* What was understood rises in, so he sees it happen as he types. */
function RiseRow({ children }: { children: React.ReactNode }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [v]);
  return <Animated.View style={{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>{children}</Animated.View>;
}

function MoneyField({ value, onChange, suffixHe, small = false }: { value: number; onChange: (t: string) => void; suffixHe?: string; small?: boolean }) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [value, pulse]);
  return (
    <Animated.View style={[s.money, small && s.moneySmall, { transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] }) }] }]}>
      <Text style={[s.moneyCur, small && { fontSize: scale.body }]}>₪</Text>
      <TextInput
        value={value ? String(Math.round(value / 100)) : ""}
        onChangeText={onChange}
        keyboardType="number-pad"
        placeholder="0"
        placeholderTextColor="rgba(247,243,250,0.3)"
        style={[s.moneyInput, small && { fontSize: scale.body, minWidth: 0, width: 56 }]}
        textAlign="center"
        accessibilityLabel={suffixHe ? `מחיר ${suffixHe}` : "מחיר בשקלים"}
      />
      {suffixHe ? <Text style={s.moneySuffix}>{suffixHe}</Text> : null}
    </Animated.View>
  );
}

const INK = "#0F0B17";
const s = StyleSheet.create({
  lineup: { flexDirection: "row-reverse", justifyContent: "center", alignItems: "flex-end", gap: 4, marginBottom: spacing.md, height: 96 },
  lineupImg: { width: 62, height: 90 },
  radiiRow: { flexDirection: "row-reverse", gap: 6 },
  radiusChip: { flex: 1, paddingHorizontal: 0, alignItems: "center" },
  svcX: { color: "rgba(247,243,250,0.6)", fontSize: scale.body, fontWeight: "700", marginRight: 4 },
  counter: { color: "#FFB08A", fontSize: scale.meta, fontWeight: "800", textAlign: "right", marginTop: -6, marginBottom: spacing.md },
  docLaw: { color: "#FF9A86", fontSize: scale.micro, fontWeight: "800", textAlign: "right", marginTop: 2 },
  previewChip: { marginTop: 10, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.06)" },
  previewText: { color: "rgba(247,243,250,0.8)", fontSize: scale.micro, textAlign: "right", lineHeight: 18 },
  sumRow: { flexDirection: "row-reverse", alignItems: "center", gap: 10, minHeight: 48, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.07)" },
  sumLabel: { color: "rgba(247,243,250,0.6)", fontSize: scale.meta, fontWeight: "700", width: 64, textAlign: "right" },
  sumValue: { flex: 1, color: "#fff", fontSize: scale.meta, fontWeight: "800", textAlign: "right" },
  sumEdit: { color: "#FF9A6B", fontSize: scale.micro, fontWeight: "800" },
  screen: { backgroundColor: INK, overflow: "hidden" },
  heroShade: { ...StyleSheet.absoluteFillObject, ...({ backgroundImage: "linear-gradient(180deg, rgba(15,11,23,0.15) 0%, rgba(15,11,23,0.75) 45%, #0F0B17 85%)" } as object) },
  top: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.08)" },
  backText: { color: "#F7F3FA", fontSize: scale.section, fontWeight: "700", marginTop: -2 },
  stepLabel: { color: "rgba(247,243,250,0.75)", fontSize: scale.micro, fontWeight: "700", textAlign: "right", marginBottom: 6 },
  bar: { height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden" },
  barFill: { position: "absolute", right: 0, top: 0, bottom: 0, borderRadius: 3, ...({ backgroundImage: "linear-gradient(270deg, #FF5C38, #8B5CF6)" } as object), backgroundColor: palette.signal500 },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: 140 },
  hero: { paddingTop: 70 },
  heroKicker: { color: "#FF9A6B", fontSize: scale.meta, fontWeight: "800", textAlign: "right", letterSpacing: 0.5 },
  heroTitle: { color: "#FFFFFF", fontSize: scale.hero, fontWeight: "900", textAlign: "right", lineHeight: 50, marginTop: 6 },
  heroSub: { color: "rgba(247,243,250,0.8)", fontSize: scale.body, textAlign: "right", marginTop: spacing.sm, marginBottom: spacing.lg, lineHeight: 24 },
  benefit: { flexDirection: "row-reverse", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.07)" },
  benefitGlyph: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", ...({ backgroundImage: "linear-gradient(135deg, #FF5C38, #8B5CF6)" } as object), backgroundColor: palette.signal500 },
  benefitGlyphText: { color: "#fff", fontSize: scale.body, fontWeight: "900" },
  benefitTitle: { color: "#fff", fontSize: scale.body, fontWeight: "800", textAlign: "right" },
  benefitSub: { color: "rgba(247,243,250,0.62)", fontSize: scale.meta, textAlign: "right", marginTop: 2 },
  h1: { color: "#fff", fontSize: scale.title, fontWeight: "900", textAlign: "right", marginTop: spacing.sm },
  h2: { color: "#fff", fontSize: scale.section, fontWeight: "800", textAlign: "right", marginTop: spacing.xl },
  lead: { color: "rgba(247,243,250,0.7)", fontSize: scale.body, textAlign: "right", marginTop: 6, marginBottom: spacing.md, lineHeight: 24 },
  section: { color: "rgba(247,243,250,0.75)", fontSize: scale.meta, fontWeight: "800", textAlign: "right", marginTop: spacing.lg, marginBottom: 8 },
  label: { color: "rgba(247,243,250,0.7)", fontSize: scale.meta, fontWeight: "700", textAlign: "right", marginTop: spacing.md, marginBottom: 6 },
  hint: { color: "rgba(247,243,250,0.55)", fontSize: scale.micro, textAlign: "right", marginTop: 8, lineHeight: 18 },
  fine: { color: "rgba(247,243,250,0.5)", fontSize: scale.micro, textAlign: "right", marginTop: spacing.lg, lineHeight: 18 },
  input: { minHeight: 48, borderRadius: 14, paddingHorizontal: 14, color: "#fff", fontSize: scale.body, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  textarea: { minHeight: 110, paddingTop: 12, textAlignVertical: "top" },
  row: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8, alignItems: "center" },
  wrap: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 44, paddingHorizontal: 14, borderRadius: 22, justifyContent: "center", backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  chipOn: { backgroundColor: "rgba(255,92,56,0.16)", borderColor: palette.signal500 },
  chipText: { color: "rgba(247,243,250,0.8)", fontSize: scale.meta, fontWeight: "700" },
  chipTextOn: { color: "#fff" },
  svc: { flexDirection: "row-reverse", alignItems: "center", gap: 10, minHeight: 52, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  svcOn: { backgroundColor: "rgba(47,191,138,0.14)", borderColor: "#2FBF8A" },
  svcCustom: { backgroundColor: "rgba(139,92,246,0.16)", borderColor: "#8B5CF6" },
  svcCheck: { color: "#2FBF8A", fontSize: scale.body, fontWeight: "900" },
  svcName: { color: "#fff", fontSize: scale.meta, fontWeight: "800", textAlign: "right" },
  svcCat: { color: "rgba(247,243,250,0.55)", fontSize: scale.micro, textAlign: "right" },
  linkRow: { minHeight: 44, justifyContent: "center" },
  linkQuiet: { color: "rgba(247,243,250,0.6)", fontSize: scale.meta, textAlign: "center", textDecorationLine: "underline" },
  fieldGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 10, marginTop: 8 },
  fieldTile: { width: "31%", minHeight: 124, alignItems: "center", justifyContent: "flex-end", paddingVertical: 10, paddingHorizontal: 4, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  fieldTileOn: { borderColor: "#2FBF8A", backgroundColor: "rgba(47,191,138,0.12)" },
  fieldImg: { width: 64, height: 64 },
  fieldLabel: { color: "#fff", fontSize: scale.body, fontWeight: "800", textAlign: "center", marginTop: 6, writingDirection: "rtl" },
  fieldBadge: { position: "absolute", top: 6, left: 6, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, backgroundColor: "#2FBF8A" },
  fieldBadgeText: { color: "#0d0a16", fontSize: scale.micro, fontWeight: "900" },
  fieldHead: { flexDirection: "row-reverse", alignItems: "center", gap: 12, marginTop: 8, marginBottom: 4, padding: 10, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.06)" },
  fieldHeadImg: { width: 48, height: 48 },
  pickRow: { minHeight: 60, flexDirection: "row-reverse", alignItems: "center", gap: 14, paddingHorizontal: 16, marginTop: 8, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  pickRowOn: { borderColor: "#2FBF8A", backgroundColor: "rgba(47,191,138,0.12)" },
  pickBox: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: "rgba(247,243,250,0.5)", alignItems: "center", justifyContent: "center" },
  pickBoxOn: { borderColor: "#2FBF8A", backgroundColor: "#2FBF8A" },
  pickTick: { color: "#0d0a16", fontSize: scale.body, fontWeight: "900" },
  pickName: { color: "#fff", fontSize: scale.body, fontWeight: "700", textAlign: "right", writingDirection: "rtl" },
  pickCat: { color: "rgba(247,243,250,0.55)", fontSize: scale.micro, textAlign: "right", marginTop: 2 },
  pickX: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: "rgba(255,255,255,0.06)" },
  addBtnBig: { minHeight: 58, paddingHorizontal: 18 },
  bigInput: { minHeight: 58, fontSize: scale.body, borderColor: "rgba(255,92,56,0.55)", borderWidth: 1.5 },
  fieldPill: { minHeight: 44, paddingHorizontal: 14, justifyContent: "center", borderRadius: 999, borderWidth: 1, borderColor: "rgba(247,243,250,0.22)", backgroundColor: "rgba(255,255,255,0.04)" },
  fieldPillOn: { backgroundColor: "#F7F3FA", borderColor: "#F7F3FA" },
  fieldPillText: { color: "#F7F3FA", fontSize: scale.meta, fontWeight: "700" },
  finder: { marginTop: 4, gap: 6 },
  findRow: { minHeight: 52, flexDirection: "row-reverse", alignItems: "center", gap: 10, paddingHorizontal: 14, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.05)" },
  findSub: { marginRight: 18, backgroundColor: "rgba(255,255,255,0.03)" },
  findAdd: { color: "#2FBF8A", fontSize: scale.body, fontWeight: "900" },
  findChevron: { color: "rgba(247,243,250,0.6)", fontSize: scale.body, fontWeight: "800" },
  nomatch: { marginTop: 12, padding: 12, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.05)" },
  nomatchText: { color: "rgba(247,243,250,0.82)", fontSize: scale.meta, textAlign: "right", writingDirection: "rtl" },
  link: { color: "#FF9A6B", fontSize: scale.meta, fontWeight: "800", textAlign: "right" },
  addBtn: { minHeight: 48, paddingHorizontal: 16, borderRadius: 14, justifyContent: "center", backgroundColor: "#8B5CF6" },
  addBtnText: { color: "#fff", fontSize: scale.meta, fontWeight: "800" },
  radar: { height: 170, marginBottom: 24, marginTop: spacing.md, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.04)", overflow: "hidden" },
  radarRing: { position: "absolute", borderWidth: 2, borderColor: "rgba(255,92,56,0.6)", backgroundColor: "rgba(255,92,56,0.08)" },
  radarGuide: { position: "absolute", borderWidth: 1, borderColor: "rgba(247,243,250,0.08)" },
  radarAxisH: { position: "absolute", left: 0, right: 0, height: 1, backgroundColor: "rgba(247,243,250,0.06)" },
  radarAxisV: { position: "absolute", top: 0, bottom: 0, width: 1, backgroundColor: "rgba(247,243,250,0.06)" },
  cityList: { marginTop: 6, borderRadius: 14, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.06)" },
  cityRow: { minHeight: 48, justifyContent: "center", paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  cityText: { color: "#fff", fontSize: scale.body, textAlign: "right", writingDirection: "rtl" },
  radarDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: palette.signal500, shadowColor: palette.signal500, shadowOpacity: 0.9, shadowRadius: 12 },
  radarText: { position: "absolute", bottom: 10, color: "rgba(247,243,250,0.8)", fontSize: scale.micro, fontWeight: "700" },
  doc: { marginBottom: 10, padding: 14, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  docDone: { borderColor: "rgba(47,191,138,0.6)" },
  docHead: { flexDirection: "row-reverse", alignItems: "flex-start", gap: 10 },
  docName: { color: "#fff", fontSize: scale.body, fontWeight: "800", textAlign: "right" },
  docWhy: { color: "rgba(247,243,250,0.6)", fontSize: scale.micro, textAlign: "right", marginTop: 2, lineHeight: 17 },
  level: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  levelLaw: { backgroundColor: "rgba(255,92,56,0.18)" },
  levelPlatform: { backgroundColor: "rgba(139,92,246,0.22)" },
  levelRec: { backgroundColor: "rgba(255,255,255,0.08)" },
  levelText: { color: "#fff", fontSize: scale.micro, fontWeight: "800" },
  upload: { marginTop: 10, minHeight: 48, borderRadius: 14, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 10, borderWidth: 1.5, borderStyle: "dashed", borderColor: "rgba(255,255,255,0.22)" },
  uploadDone: { borderStyle: "solid", borderColor: "rgba(47,191,138,0.6)", backgroundColor: "rgba(47,191,138,0.08)" },
  uploadText: { color: "rgba(247,243,250,0.85)", fontSize: scale.meta, fontWeight: "700" },
  thumb: { width: 34, height: 34, borderRadius: 8 },
  priceCard: { marginBottom: 12, padding: 14, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  priceName: { color: "#fff", fontSize: scale.body, fontWeight: "900", textAlign: "right" },
  priceKind: { color: "rgba(247,243,250,0.6)", fontSize: scale.micro, textAlign: "right", marginTop: 2, marginBottom: 10 },
  preview: { color: "#FFB08A", fontSize: scale.micro, textAlign: "right", marginTop: 8 },
  listRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8, marginBottom: 8 },
  remove: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.06)" },
  removeText: { color: "rgba(247,243,250,0.7)", fontSize: scale.body, fontWeight: "800" },
  money: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, alignSelf: "stretch", minHeight: 58, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,92,56,0.45)" },
  /* A web input is as wide as its browser default unless told; the row ran off the screen. */
  moneySmall: { alignSelf: "auto", minHeight: 48, paddingHorizontal: 8, width: 96, flexShrink: 0 },
  moneyCur: { color: "#fff", fontSize: scale.title, fontWeight: "900" },
  moneyInput: { minWidth: 70, color: "#fff", fontSize: scale.title, fontWeight: "900" },
  moneySuffix: { color: "rgba(247,243,250,0.6)", fontSize: scale.meta, fontWeight: "700" },
  shopStage: { height: 230, borderRadius: 22, overflow: "hidden", alignItems: "center", justifyContent: "flex-end", ...({ backgroundImage: "radial-gradient(120% 90% at 50% 20%, #3A2166 0%, #160F26 70%)" } as object), backgroundColor: "#1B1230" },
  facade: { width: 220, height: 210 },
  sign: { position: "absolute", top: 64, minWidth: 190, justifyContent: "center", flexDirection: "row-reverse", alignItems: "center", gap: 8, maxWidth: "80%", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12, borderWidth: 2, backgroundColor: "rgba(10,6,18,0.85)", shadowOpacity: 0.9, shadowRadius: 18 },
  signLogo: { width: 26, height: 26, borderRadius: 13 },
  signText: { fontSize: scale.section, fontWeight: "900" },
  glow: { position: "absolute", bottom: -40, width: 260, height: 80, borderRadius: 130, opacity: 0.28 },
  swatch: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: "transparent" },
  swatchOn: { borderColor: "#fff", transform: [{ scale: 1.12 }] },
  photoOpt: { flex: 1, minWidth: 140, height: 190, borderRadius: 20, alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.12)" },
  photoOptOn: { borderColor: palette.signal500, backgroundColor: "rgba(255,92,56,0.1)" },
  photoImg: { width: 110, height: 110, borderRadius: 55 },
  photoPlus: { fontSize: scale.title },
  photoLabel: { color: "#fff", fontSize: scale.meta, fontWeight: "800" },
  card: { flexDirection: "row-reverse", alignItems: "center", gap: 12, padding: 14, borderRadius: 20, borderWidth: 1.5, backgroundColor: "rgba(255,255,255,0.05)" },
  cardPhoto: { width: 58, height: 58, borderRadius: 29, backgroundColor: "#2a2238" },
  cardName: { color: "#fff", fontSize: scale.body, fontWeight: "900", textAlign: "right" },
  cardMeta: { color: "rgba(247,243,250,0.62)", fontSize: scale.micro, textAlign: "right", marginTop: 2 },
  cardLogo: { width: 34, height: 34, borderRadius: 17 },
  approval: { flexDirection: "row-reverse", alignItems: "center", gap: 12, paddingVertical: 10 },
  approvalDot: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.1)" },
  approvalNum: { color: "#fff", fontSize: scale.meta, fontWeight: "900" },
  approvalText: { color: "rgba(247,243,250,0.85)", fontSize: scale.meta, fontWeight: "700", textAlign: "right", flex: 1 },
  foot: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.lg, backgroundColor: INK, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)" },
  skip: { alignSelf: "center", minHeight: 44, justifyContent: "center", paddingHorizontal: 12, marginBottom: 2 },
  skipText: { color: "rgba(247,243,250,0.75)", fontSize: scale.meta, fontWeight: "700", textDecorationLine: "underline" },
  whyNot: { color: "rgba(247,243,250,0.55)", fontSize: scale.micro, textAlign: "center", marginBottom: 6 },
  cta: { height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", backgroundColor: palette.signal500, ...({ backgroundImage: "linear-gradient(90deg, #8B5CF6 0%, #FF5C38 70%)" } as object), shadowColor: palette.signal500, shadowOpacity: 0.5, shadowRadius: 18 },
  ctaOff: { opacity: 0.4 },
  ctaText: { color: "#fff", fontSize: scale.body, fontWeight: "900" },
});
