import React from "react";
import { View } from "react-native";

import { shadowFor } from "./contactShadow";

export { shadowFor, liftFromBob, SHADOW } from "./contactShadow";

/**
 * The ellipse itself. See `contactShadow.ts` for why it exists in code
 * rather than in the artwork.
 *
 * It is positioned by its CENTRE on the figure's ground point, and the
 * figure is drawn over it — so the near edge of the ellipse appears in
 * front of the feet, which is what a patch on the floor looks like.
 */
export interface ContactShadowProps {
  /** The figure's on-screen width, already scaled for depth. */
  figureWidth: number;
  /** 0 planted, 1 at the top of a stride. */
  lift?: number;
  /** Where the feet are, in the parent's coordinates. */
  left: number;
  top: number;
}

export function ContactShadow({ figureWidth, lift = 0, left, top }: ContactShadowProps) {
  const s = shadowFor(figureWidth, lift);
  if (s.width <= 0) return null;

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: left - s.width / 2,
        top: top - s.height / 2,
        width: s.width,
        height: s.height,
        borderRadius: s.height / 2,
        /*
         * One flat ink, not a gradient and not a platform shadow.
         *
         * `shadowRadius`/`elevation` are lit from a direction and are
         * drawn differently on iOS, Android and the web, which is exactly
         * the disagreement this whole component exists to avoid. A plain
         * translucent ellipse looks the same everywhere and claims
         * nothing about where the light is.
         */
        backgroundColor: `rgba(14,10,20,${s.opacity.toFixed(3)})`,
      }}
    />
  );
}
