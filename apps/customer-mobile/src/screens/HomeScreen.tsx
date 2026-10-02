import React, { useEffect, useMemo, useState } from "react";
import { useWindowDimensions, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  catalogHomeServices,
  catalogMatchRules,
  CustomerHomeBody,
  customerTheme,
} from "@pro-now/ui";
import type { CustomerStackParamList } from "../navigation/types";
import { api } from "../api/client";
import { worldSources } from "../world/worldSources";

type Props = NativeStackScreenProps<CustomerStackParamList, "Home">;

/**
 * C04 — Home.
 *
 * ---------------------------------------------------------------------
 * THE SCREEN PEOPLE INSTALL IS NOW THE SCREEN WE REVIEW
 * ---------------------------------------------------------------------
 * This was a hand-written grid of department tiles with its own
 * stylesheet, written during Epic 0 before `packages/ui` had a home
 * screen. Everything since — the world behind the top third, the faces on
 * the category tiles, the capture row, the honest availability line, the
 * door to the street — was built in `CustomerHomeBody` and shown only in
 * the developer gallery.
 *
 * So there were two home screens: one we looked at every day and one the
 * app would actually have shipped. They had already diverged in what they
 * listed and in what order. This screen is now the same component the
 * gallery renders, given real data.
 *
 * ---------------------------------------------------------------------
 * WHAT IS REAL AND WHAT IS NOT, STATED PLAINLY
 * ---------------------------------------------------------------------
 * The catalogue comes from `/v1/catalog` and decides WHICH services exist
 * here; the shared adapter decides how each one is presented. Availability
 * is the server's snapshot or nothing at all — `/CLAUDE.md §3` forbids
 * inventing it, so a failed request shows no count rather than a
 * comforting one.
 */
export function HomeScreen({ navigation }: Props) {
  const { width, height } = useWindowDimensions();

  const [liveIds, setLiveIds] = useState<Set<string> | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .getCatalog()
      .then((res) => {
        if (!alive) return;
        /*
         * WHICH SERVICES THIS MARKET HAS, FROM THE SERVER.
         *
         * The adapter knows how to present every service in the
         * catalogue; the server knows which of them are activated here.
         * Presentation is shared, activation is not — that split is why a
         * service can be drawn correctly and still not be offered.
         */
        const ids = new Set<string>();
        for (const d of res.departments) {
          for (const c of d.categories) {
            for (const s of c.services) ids.add(s.id);
          }
        }
        setLiveIds(ids);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  /*
   * Until the catalogue answers, the grid shows the full set rather than
   * an empty screen — nothing here claims availability, so showing what
   * the product does is honest while the request is in flight. A failure
   * keeps that and adds no count, which is the difference between "we do
   * not know yet" and "nobody is free".
   */
  const services = useMemo(
    () => (liveIds ? catalogHomeServices.filter((s) => liveIds.has(s.id)) : catalogHomeServices),
    [liveIds]
  );

  return (
    <View style={{ flex: 1, backgroundColor: customerTheme.colors.bg }}>
      <CustomerHomeBody
        greetingHe="שלום"
        services={services}
        matchRules={catalogMatchRules}
        /*
         * NO SNAPSHOT YET, AND SAYING SO BY OMISSION.
         *
         * There is no availability endpoint on the client, so this screen
         * has nothing true to say about who is free. Passing nothing is
         * the honest shape: the component already knows how to show a
         * home screen that does not claim supply, and inventing a count
         * to fill the gap is exactly what /CLAUDE.md §3 forbids. Wire the
         * snapshot here the day the endpoint exists.
         */
        /*
         * Null, not zero. A failed or pending request must not read as
         * "nobody is available" — see /CLAUDE.md §3.
         */
        totalAvailableNow={null}
        liveLineHe={failed ? null : undefined}
        worldSources={worldSources}
        onSelectService={(id) => {
          // The route carries the name so the next screen has a title
          // before its own request returns — the adapter already knows it.
          const name = services.find((s) => s.id === id)?.nameHe ?? "";
          navigation.navigate("RequestDetails", { serviceId: id, serviceName: name });
        }}
        /*
         * A category id, and now the parameter says so. It always was
         * one — `CustomerHomeBody` hands back a category, not a
         * department — but the route called it `departmentCode`, and the
         * screen on the other end read neither and showed plumbing.
         */
        onSelectCategory={(categoryId) => navigation.navigate("ServiceSelect", { categoryId })}
        width={width}
        height={height}
      />
    </View>
  );
}
