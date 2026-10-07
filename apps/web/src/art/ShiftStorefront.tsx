import { tradeCharacterFor, tradeShopFor } from "../tradeCharacter";

/**
 * THE SHIFT IS THEIR SHOP (the demo's `ShiftStorefront`,
 * tools/design-preview/src/App.tsx; its pro round 3).
 *
 * The shift screen's picture is the shop they built when they joined,
 * standing in our city with their sign. Off shift the shutter is down and
 * the lamps are low; starting the shift rolls it up and the sign lights.
 * Their own art and no new promise: it says only whether they are on shift.
 */
export interface StorefrontShop {
  name: string;
  brandColor: string;
  logoUri: string | null;
  /** The first service's catalogue code: which house in our street is theirs. */
  serviceCode: string | null;
  /** Their own photo at the door, else their trade's drawn character. */
  portraitUri: string | null;
}

/** Keyframes, not transitions: the band is rebuilt when the shift starts or ends, so these play each time (the demo's UX audit). */
const CSS =
  "@keyframes pnShutterUp{from{transform:scaleY(1)}to{transform:scaleY(0)}}@keyframes pnShutterDown{from{transform:scaleY(0)}to{transform:scaleY(1)}}@keyframes pnLightOn{from{opacity:0}to{opacity:1}}@keyframes pnShopWake{from{filter:brightness(.5) saturate(.6)}to{filter:brightness(.92) saturate(.95)}}@keyframes pnShopSleep{from{filter:brightness(.92) saturate(.95)}to{filter:brightness(.5) saturate(.6)}}@keyframes pnDim{from{opacity:0}to{opacity:.28}}@keyframes pnUndim{from{opacity:.28}to{opacity:0}}";

/** "PRO NOW" above the business name: the sign of every shop opened with us. */
function ProNowMark({ size }: { size: number }) {
  return (
    <span style={{ display: "block", direction: "ltr", fontSize: size, fontWeight: 900, letterSpacing: 0.5, lineHeight: 1.1 }}>
      <span style={{ color: "#fff" }}>PRO </span>
      <span style={{ color: "#FF6B4A" }}>NOW</span>
    </span>
  );
}

/** Their sign painted over the facade's drawn one, where it sits on every facade (33.5%–50% of its height). `px` is the facade's height. */
function FacadeWithSign({ facadeUri, shop, px }: { facadeUri: string; shop: StorefrontShop; px: number }) {
  const c = shop.brandColor;
  const name = shop.name.trim();
  const bh = px * 0.165;
  const nameSize = Math.max(10, Math.min(bh * 0.44, ((px * 0.7) / Math.max(4, name.length)) * 1.6));
  return (
    <div style={{ position: "relative", height: "100%", aspectRatio: "1" }}>
      <img src={facadeUri} alt="" style={{ width: "100%", height: "100%", display: "block" }} />
      <div
        style={{
          position: "absolute", left: "8%", right: "8%", top: "33.5%", height: "16.5%", borderRadius: bh * 0.2,
          border: `2px solid ${c}`, background: "#120c1c", boxShadow: `0 0 ${bh * 0.5}px ${c}`,
          display: "flex", alignItems: "center", justifyContent: "center", gap: bh * 0.14, padding: `0 ${bh * 0.16}px`, direction: "rtl",
        }}
      >
        {shop.logoUri ? (
          <img src={shop.logoUri} alt="" style={{ width: bh * 0.7, height: bh * 0.7, borderRadius: "50%", objectFit: "cover", border: `1.5px solid ${c}` }} />
        ) : null}
        <span style={{ display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1.05, minWidth: 0 }}>
          <ProNowMark size={Math.max(8, bh * 0.24)} />
          <span style={{ fontSize: nameSize, fontWeight: 900, color: "#fff", whiteSpace: "nowrap", textShadow: `0 0 8px ${c}, 0 0 18px ${c}` }}>{name}</span>
        </span>
      </div>
    </div>
  );
}

/** Them at the door once the shop is open: their photo, else their trade's figure. */
function AtTheDoor({ shop }: { shop: StorefrontShop }) {
  const c = shop.brandColor;
  if (shop.portraitUri)
    return (
      <img
        src={shop.portraitUri}
        alt=""
        style={{ position: "absolute", left: "50%", bottom: "6%", width: 72, height: 72, marginLeft: 26, borderRadius: 36, objectFit: "cover", border: `3px solid ${c}`, boxShadow: `0 0 18px ${c}` }}
      />
    );
  return (
    <img
      src={tradeCharacterFor(shop.serviceCode).replace("_icon.", "_world.")}
      alt=""
      style={{ position: "absolute", left: "50%", bottom: 0, height: "40%", marginLeft: 18, filter: "drop-shadow(0 10px 14px rgba(0,0,0,.55))" }}
    />
  );
}

/** The band's height with a shop in it (the demo's `bandHeight`). */
export const STOREFRONT_BAND_H = 210;

export function ShiftStorefront({ shop, online }: { shop: StorefrontShop; online: boolean }) {
  const c = shop.brandColor;
  return (
    <div
      aria-hidden
      data-testid="shift-storefront"
      data-open={online ? "yes" : "no"}
      style={{ position: "absolute", inset: 0, overflow: "hidden", background: "radial-gradient(120% 90% at 50% 20%, #3A2166 0%, #160F26 72%)" }}
    >
      <style>{CSS}</style>
      {/* A quieter city behind, so the shop does not take the focus. */}
      <img
        src="/world/splash_city.webp"
        alt=""
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "64% 50%", opacity: 0.22, filter: "blur(3px)" }}
      />
      {/* The shutter is the state: opening rolls it up in 0.9s and the band brightens; closing is slower and heavier. */}
      <div
        style={{
          position: "absolute", inset: 0, background: "#000", opacity: online ? 0 : 0.28,
          animation: online ? "pnUndim .9s ease-out both" : "pnDim 1.4s ease-in both", pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute", left: "50%", bottom: 0, height: "88%", transform: "translateX(-50%)",
          animation: online ? "pnShopWake .6s ease-out .45s both" : "pnShopSleep 1.4s ease-in both",
        }}
      >
        <div
          style={{
            position: "absolute", left: "8%", right: "8%", top: "48%", bottom: 0,
            background: `radial-gradient(60% 70% at 50% 60%, ${c}55, transparent 70%)`,
            opacity: online ? 1 : 0, animation: online ? "pnLightOn .7s ease-out .5s both" : undefined, pointerEvents: "none",
          }}
        />
        <FacadeWithSign facadeUri={tradeShopFor(shop.serviceCode)} shop={shop} px={STOREFRONT_BAND_H * 0.88} />
        {/* The shutter over the shopfront: down off shift, rolled up on it. */}
        <div
          data-testid="shift-shutter"
          style={{
            position: "absolute", left: "11%", right: "11%", top: "52%", bottom: "5%",
            background: "repeating-linear-gradient(180deg, #5b5566 0 7px, #474252 7px 9px)",
            boxShadow: "inset 0 -6px 12px rgba(0,0,0,.45)",
            transformOrigin: "top", transform: online ? "scaleY(0)" : "scaleY(1)",
            animation: online ? "pnShutterUp .9s cubic-bezier(.2,.7,.2,1) .1s both" : "pnShutterDown 1.4s cubic-bezier(.6,0,.4,1) both",
          }}
        />
      </div>
      {online ? <AtTheDoor shop={shop} /> : null}
    </div>
  );
}
