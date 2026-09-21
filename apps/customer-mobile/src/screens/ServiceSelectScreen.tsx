import React, { useEffect, useMemo, useState } from "react";
import { useWindowDimensions, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { CUSTOMER_CATEGORIES, customerCategoryById } from "@pro-now/types";
import { CategoryBody, catalogCategoryServices, customerDarkTheme } from "@pro-now/ui";

import type { CustomerStackParamList } from "../navigation/types";
import { api } from "../api/client";
import { worldSources } from "../world/worldSources";

type Props = NativeStackScreenProps<CustomerStackParamList, "ServiceSelect">;

/**
 * C05 — what is behind one of the eight front doors.
 *
 * ---------------------------------------------------------------------
 * WHAT THIS SCREEN USED TO DO
 * ---------------------------------------------------------------------
 * It listed seven Hebrew strings written into the component — "סתימה",
 * "נזילה", "ברז / כיור", "אסלה" — and navigated every one of them to the
 * same hard-coded service id, `HOME_PLUMB_BLOCK`. It never read the route
 * parameter. Tapping "חיות" and tapping "רכב" both opened a plumbing list
 * and both requested a blocked drain.
 *
 * Amit found it from the outside: *"איפה כל הדברים של כל המקצועות? למה
 * אין, ולא קיים בקטלוג?"* — and /CLAUDE.md §3 names the shape of the
 * mistake: no hard-coded plumber-only architecture.
 *
 * The rows now come from `pilotCatalog`, joined to the tapped category by
 * its departments, in `packages/ui`'s catalogue adapter — the same source
 * the home grid, the sentence matcher and the professional's eligibility
 * list read. Adding a service is one entry in one file, and a service that
 * does not exist cannot be offered here.
 *
 * ---------------------------------------------------------------------
 * AND THE WAY OUT OF THE LIST
 * ---------------------------------------------------------------------
 * `CategoryBody` carries a text field, because the home screen opens by
 * inviting the customer to describe their problem and a second screen that
 * answers with a closed list takes that invitation back. Anyone whose
 * fault is not one of the rows types it, and the sentence matcher routes
 * it — which is the path the old screen labelled "לא יודע מה הבעיה" and
 * then sent to a blocked drain.
 */
export function ServiceSelectScreen({ navigation, route }: Props) {
  const { width, height } = useWindowDimensions();
  const { categoryId } = route.params;

  /*
   * An unknown id is a routing mistake, not a customer's problem. Falling
   * back to the first category shows a real screen with real services
   * rather than an empty one, and the customer can always go back.
   */
  const category = customerCategoryById(categoryId) ?? CUSTOMER_CATEGORIES[0];

  const [liveIds, setLiveIds] = useState<Set<string> | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .getCatalog()
      .then((res) => {
        if (!alive) return;
        /*
         * The adapter knows how to present every service; the server knows
         * which are activated in this market. Presentation is shared,
         * activation is not — see HomeScreen for the same split.
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
        /* Keep the full list. "We do not know yet" is not "nothing here". */
      });
    return () => {
      alive = false;
    };
  }, []);

  const services = useMemo(() => {
    const rows = catalogCategoryServices[category.id] ?? [];
    return liveIds ? rows.filter((s) => liveIds.has(s.id)) : rows;
  }, [category.id, liveIds]);

  return (
    <View style={{ flex: 1, backgroundColor: customerDarkTheme.colors.bg }}>
      <CategoryBody
        category={category}
        services={services}
        worldSources={worldSources}
        onSelectService={(serviceId) => {
          const name = services.find((s) => s.id === serviceId)?.nameHe ?? "";
          navigation.navigate("RequestDetails", { serviceId, serviceName: name });
        }}
        onDescribe={(textHe) => {
          /*
           * Their own words, carried forward rather than resolved here.
           * The sentence matcher lives with the catalogue and the next
           * screen already takes a description; picking a service for them
           * at this point would be a guess made in a component.
           */
          navigation.navigate("RequestDetails", {
            serviceId: services[0]?.id ?? "",
            serviceName: category.labelHe,
            describedHe: textHe,
          });
        }}
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
        width={width}
        height={height}
      />
    </View>
  );
}
