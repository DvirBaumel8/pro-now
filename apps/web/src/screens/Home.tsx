import { useState } from "react";
import { View } from "react-native";
import { useNavigate } from "react-router";
import {
  AppHeader,
  AppMenuBody,
  CustomerHomeBody,
  catalogHiddenServices,
  catalogHomeServices,
  catalogMatchRules,
} from "@pro-now/ui";
import { avatarById, greetingAt } from "@pro-now/types";

import { useMe } from "../api";
import { authClient } from "../auth";
import { CityHero } from "../art/CityHero";
import { worldSources } from "../art/worldSources";
import { useFrame } from "../frame";

/** The header's own height in the demo's customer shell (`UTIL`). */
const HEADER_H = 56;

/**
 * The customer's side: the demo's shell (header, then the body under it)
 * with home and the menu, fed only what is true.
 *
 * - Services: the same catalogue the demo shows (packages/ui), with each
 *   service's own coming-soon / not-in-market state. The demo opens every
 *   service for demonstration; the product does not.
 * - Availability, "recent" and the live line are left out rather than
 *   invented (CLAUDE.md §3): they arrive with real supply and real jobs
 *   (W6/W7).
 * - Controls whose screens belong to later epics are visible and disabled
 *   (docs/21 W2, option a): camera/gallery/recording (W4), a category or a
 *   service (W6), the stroll (the city epic), the business link, the
 *   account card. Text search works: it matches against the catalogue on
 *   the device.
 */
const HOME_SERVICES = [...catalogHomeServices, ...catalogHiddenServices];

type Tab = "home" | "menu";

export function Home() {
  const { width, height } = useFrame();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("home");
  const me = useMe();
  /* The face they chose, in the header, as in the demo; the glyph if none. */
  const chosen = avatarById(me.data?.customer?.avatarId ?? null);
  const avatarUri = chosen ? ((worldSources[chosen.portraitAssetId] as { uri?: string } | undefined)?.uri ?? null) : null;
  const bodyH = height - HEADER_H;

  const signOut = async () => {
    await authClient.signOut();
    navigate("/welcome", { replace: true });
  };

  return (
    <View style={{ width, height }}>
      {/* The same button closes the menu again, as in the demo. */}
      <AppHeader width={width} greetingHe={null} avatarUri={avatarUri} onMenu={() => setTab(tab === "menu" ? "home" : "menu")} />
      <View style={{ height: bodyH, overflow: "hidden" }}>
        {tab === "menu" ? (
          <AppMenuBody
            /*
             * The demo's menu, row for row, without its demonstration group
             * and with a way out. Rows whose screens have not shipped are
             * shown disabled; support rows wait for the support-channel
             * decision (CLAUDE.md §4).
             */
            groups={[
              {
                titleHe: "העבודות שלי",
                items: [{ id: "calls", labelHe: "הקריאות שלי", detailHe: "היסטוריה, קריאה פעילה ודירוגים", upcoming: true }],
              },
              {
                titleHe: "החשבון",
                items: [
                  { id: "card", labelHe: "החשבון שלי", detailHe: "פרטים, אמצעי תשלום והיסטוריית חיובים", upcoming: true },
                  { id: "address", labelHe: "הכתובות שלי", detailHe: "לאן שולחים את המקצוען", onPress: () => navigate("/addresses") },
                  { id: "avatar", labelHe: "הדמות שלי", detailHe: "מי מטייל ברחוב בזמן ההמתנה", onPress: () => navigate("/avatar") },
                  { id: "sign-out", labelHe: "יציאה", detailHe: "יציאה מהחשבון במכשיר הזה", onPress: signOut },
                ],
              },
              {
                titleHe: "עזרה",
                items: [
                  { id: "whatsapp", labelHe: "ואטסאפ", upcoming: true },
                  { id: "email", labelHe: "אימייל", upcoming: true },
                ],
              },
              {
                titleHe: "העולם",
                items: [
                  { id: "stroll", labelHe: "טיול בשכונה", detailHe: "בלי בקשה פתוחה", upcoming: true },
                  { id: "advertise", labelHe: "יש לך עסק?", detailHe: "פתיחת חנות בשכונה של PRO NOW", upcoming: true },
                ],
              },
            ]}
            onBack={() => setTab("home")}
            width={width}
            height={bodyH}
          />
        ) : (
          <CustomerHomeBody
            backdrop={<CityHero />}
            greetingHe={greetingAt(new Date())}
            services={HOME_SERVICES}
            matchRules={catalogMatchRules}
            worldSources={worldSources}
            nowMs={Date.now()}
            strollUpcoming
            advertiseUpcoming
            width={width}
            height={bodyH}
          />
        )}
      </View>
    </View>
  );
}
