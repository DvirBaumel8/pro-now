/**
 * THE WAYS INTO THE STREET AND BACK OUT (the demo's strollDoor and the city's
 * onExit: "back is back — to the screen the street was opened from, never a
 * jump home that loses a live job").
 *
 * `/world` carries where it was opened from as `?from=`; only a job's own
 * screen is accepted there, so the parameter can never send anybody off the
 * app or somewhere unexpected. `?shop=` opens a shop on arrival: coming back
 * from a service chosen inside it lands inside it again.
 */
const JOB_PATH = /^\/jobs\/[A-Za-z0-9_-]{1,64}$/;
const SHOP_ID = /^[a-z_]{1,32}$/;

/** A job's screen to return to, or null for anything else. */
export function worldReturnPath(raw: string | null | undefined): string | null {
  return raw && JOB_PATH.test(raw) ? raw : null;
}

/** The job id behind a return path, for showing who is on the way. */
export function worldReturnJobId(from: string | null): string | null {
  return from ? from.slice("/jobs/".length) : null;
}

export function worldShopParam(raw: string | null | undefined): string | null {
  return raw && SHOP_ID.test(raw) ? raw : null;
}

export function worldHref(opts: { from?: string | null; shop?: string | null } = {}): string {
  const params = new URLSearchParams();
  const from = worldReturnPath(opts.from);
  const shop = worldShopParam(opts.shop);
  if (from) params.set("from", from);
  if (shop) params.set("shop", shop);
  const query = params.toString();
  return query ? `/world?${query}` : "/world";
}

/**
 * One door, two answers (the demo's strollDoor): with a figure it opens the
 * street; without one it opens the picker, which goes on into the street.
 */
export function strollHref(hasAvatar: boolean, from: string | null = null): string {
  if (hasAvatar) return worldHref({ from });
  const back = worldReturnPath(from);
  return back ? `/avatar?then=world&from=${encodeURIComponent(back)}` : "/avatar?then=world";
}
