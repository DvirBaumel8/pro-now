import { useMemo, useState } from "react";
import { View } from "react-native";
import { useNavigate, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";

import { api, useMe } from "../api";
import { CityHero } from "../art/CityHero";
import { useFrame } from "../frame";
import { ErrorScreen, LoadingScreen } from "../states";
import {
  createWorldScene,
  WorldCanvas,
  WorldOverlay,
  worldTradesFromCatalog,
  type WorldSceneModel,
  type WorldEvent,
} from "../world";
import { worldReturnPath, worldShopParam } from "../world/worldLinks";

export function World() {
  const { width, height } = useFrame();
  const navigate = useNavigate();
  const me = useMe();
  const catalog = useQuery({ queryKey: ["catalog"], queryFn: api.getCatalog, staleTime: 5 * 60_000 });
  /*
   * Back is back (the demo's city onExit): to the job the street was opened
   * from, or home. Coming back from a service chosen in a shop opens that
   * shop again rather than the start of the street.
   */
  const [params] = useSearchParams();
  const from = worldReturnPath(params.get("from"));
  const [nearShopId, setNearShopId] = useState<string | null>(null);
  // The shop asked for (the walk in starts) and the shop you are standing in
  // (the scene says so once the walk in ends, and null once the walk out does).
  const [openShopId, setOpenShopId] = useState<string | null>(() => worldShopParam(params.get("shop")));
  const [insideShopId, setInsideShopId] = useState<string | null>(null);
  const [worldError, setWorldError] = useState(false);

  const trades = useMemo(
    () => worldTradesFromCatalog(catalog.data ?? { marketCode: "", departments: [] }),
    [catalog.data]
  );
  const mode: WorldSceneModel["mode"] = worldError || catalog.isError ? "FALLBACK" : "EXPLORE";
  const scene = useMemo(
    () => ({
      mode,
      departmentCode: null,
      avatarNo: me.data?.customer?.avatarId ? 1 : null,
      shopId: openShopId,
      route: null,
      trades,
    }),
    [me.data?.customer?.avatarId, mode, openShopId, trades]
  );
  if (catalog.isPending) return <LoadingScreen />;
  if (catalog.isError) return <ErrorScreen offline={!navigator.onLine} onRetry={() => void catalog.refetch()} />;

  // Without the 3D street there is no walk: the shop's list opens at once.
  const flat = scene.mode === "FALLBACK";
  const inside = flat ? openShopId : insideShopId;
  // While the camera walks you in or out, the screen is the camera's, as in the demo.
  const walking = !flat && openShopId !== insideShopId;
  const nearbyTrade = !walking && nearShopId ? trades[nearShopId] ?? null : null;
  const openTrade = !walking && inside ? trades[inside] ?? null : null;
  const exit = () => navigate(from ?? "/");

  const onEvent = (event: WorldEvent) => {
    switch (event.type) {
      case "SHOP_NEAR":
        setNearShopId(event.shopId);
        return;
      case "ENTER_SHOP":
        setOpenShopId(event.shopId);
        return;
      case "INSIDE_SHOP":
        setInsideShopId(event.shopId);
        return;
      case "LEAVE_SHOP":
        setOpenShopId(null);
        if (flat) setInsideShopId(null);
        return;
      case "REQUEST_SERVICE":
        // The service page's back returns into this shop (Home reads `worldShop`).
        navigate(`/?service=${encodeURIComponent(event.serviceId)}`, { state: { worldShop: openShopId } });
        return;
      case "EXIT":
        exit();
        return;
      case "WORLD_ERROR":
        setWorldError(true);
        setNearShopId((current) => current ?? Object.values(trades)[0]?.shopId ?? null);
        return;
    }
  };

  return (
    <View style={{ width, height }}>
      <WorldCanvas
        mode={scene.mode}
        route={scene.route}
        avatarNo={scene.avatarNo}
        scene={scene}
        sceneFactory={createWorldScene}
        arrival
        onEvent={onEvent}
        fallback={<CityHero />}
      />
      <WorldOverlay
        mode={scene.mode}
        nearbyTrade={nearbyTrade}
        openTrade={openTrade}
        onEvent={onEvent}
      />
    </View>
  );
}
