import type { ReactNode } from "react";
import { View } from "react-native";
import { useNavigate } from "react-router";
import { AppHeader } from "@pro-now/ui";
import { avatarById } from "@pro-now/types";

import { useMe } from "./api";
import { worldSources } from "./art/worldSources";
import { SubFrame, useFrame } from "./frame";

/** The header's own height in the demo's customer shell (`UTIL`). */
export const HEADER_H = 56;

/** The face the customer chose, for the header; null draws the glyph. */
export function useAvatarUri(): string | null {
  const me = useMe();
  const chosen = avatarById(me.data?.customer?.avatarId ?? null);
  return chosen ? ((worldSources[chosen.portraitAssetId] as { uri?: string } | undefined)?.uri ?? null) : null;
}

/**
 * The customer's header above a screen that is not home — the job, from
 * searching to the review — as in the demo, where it never goes away
 * (docs/DEMO-SYNC.md, 2026-10-01 C1). Its menu opens home's menu.
 */
export function WithHeader({ children }: { children: ReactNode }) {
  const { width, height } = useFrame();
  const navigate = useNavigate();
  const avatarUri = useAvatarUri();
  return (
    <View style={{ width, height }}>
      <AppHeader width={width} greetingHe={null} avatarUri={avatarUri} onMenu={() => navigate("/", { state: { menu: true } })} />
      <SubFrame height={height - HEADER_H}>{children}</SubFrame>
    </View>
  );
}
