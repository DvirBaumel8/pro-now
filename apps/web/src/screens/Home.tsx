import { View } from "react-native";
import { AppHeader, CustomerHomeBody, catalogHiddenServices, catalogHomeServices, catalogMatchRules } from "@pro-now/ui";
import { greetingAt } from "@pro-now/types";

import { CityHero } from "../art/CityHero";
import { worldSources } from "../art/worldSources";
import { useFrame } from "../frame";

/** The header's own height in the demo's customer shell (`UTIL`). */
const HEADER_H = 56;

/**
 * The customer's home: the demo's header and CustomerHomeBody over the
 * demo's street, fed only what is true.
 *
 * - Services: the same catalogue the demo shows (packages/ui), with each
 *   service's own coming-soon / not-in-market state. The demo opens every
 *   service for demonstration; the product does not.
 * - Availability, "recent" and the live line are left out rather than
 *   invented (CLAUDE.md §3): they arrive with real supply and real jobs
 *   (W6/W7).
 */
const HOME_SERVICES = [...catalogHomeServices, ...catalogHiddenServices];

export function Home() {
  const { width, height } = useFrame();
  return (
    <View style={{ width, height }}>
      <AppHeader width={width} greetingHe={null} />
      <View style={{ height: height - HEADER_H, overflow: "hidden" }}>
        <CustomerHomeBody
          backdrop={<CityHero />}
          greetingHe={greetingAt(new Date())}
          services={HOME_SERVICES}
          matchRules={catalogMatchRules}
          worldSources={worldSources}
          nowMs={Date.now()}
          width={width}
          height={height - HEADER_H}
        />
      </View>
    </View>
  );
}
