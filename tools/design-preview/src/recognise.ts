/**
 * WHAT IS IN THE PHOTO.
 *
 * Amit: *"ולצלם ושיזהה לפי צילום מה הבעיה!"* The published preview runs
 * inside Claude, and a page there can ask Claude to look at a picture
 * (the `sample` capability). So the photo the customer takes is really
 * looked at, and the answer is one of OUR services — chosen from the
 * catalogue's own list, never a free-text trade that does not exist.
 *
 * Where the page is not inside Claude (a local run, a tab of its own)
 * `claude.use("sample")` resolves null and this returns null: the photo is
 * still attached, and the customer picks the service themselves. The first
 * call asks the viewer to allow it and uses their own Claude usage — which
 * is the viewer's call, and a "no" simply hides the feature.
 */
export interface Recognition {
  serviceId: string | null;
  problemHe: string;
}

type SampleFn = ((
  input: string,
  opts?: { images?: Blob | Blob[]; modelTier?: "quick" | "default" | "complex" }
) => Promise<{ text: string }>) & {
  json: <T>(input: string, opts?: { images?: Blob | Blob[]; modelTier?: "quick" | "default" | "complex" }) => Promise<T>;
  limits: () => Promise<{ images?: { maxCount: number } }>;
};

let samplePromise: Promise<SampleFn | null> | null = null;
function getSample(): Promise<SampleFn | null> {
  if (samplePromise) return samplePromise;
  const c = (typeof window !== "undefined" ? (window as unknown as { claude?: { use: (n: string) => Promise<unknown> } }).claude : undefined);
  samplePromise = c?.use ? (c.use("sample") as Promise<SampleFn | null>).catch(() => null) : Promise.resolve(null);
  return samplePromise;
}

/** True where a photo can be recognised (resolves once the viewer answers). */
export async function canRecognise(): Promise<boolean> {
  const s = await getSample();
  if (!s) return false;
  const lim = await s.limits().catch(() => null);
  return !!lim?.images;
}

export async function recognisePhoto(
  photos: Blob[],
  services: ReadonlyArray<{ id: string; nameHe: string }>
): Promise<Recognition | null> {
  const s = await getSample();
  if (!s || photos.length === 0) return null;
  const list = services.map((x) => `${x.id} — ${x.nameHe}`).join("\n");
  const prompt =
    "These are photos a customer took of a problem at home or on the go, for a service app in Israel. " +
    "Decide which ONE service from this list fits best, and describe the problem in one short Hebrew sentence " +
    "(what you see, e.g. 'נזילה מהברז מתחת לכיור'). If nothing on the list fits, or the photo does not show a " +
    "problem, use null for serviceId.\n\nServices (id — Hebrew name):\n" + list +
    '\n\nReply with only JSON: {"serviceId": string|null, "problemHe": string}';
  try {
    const out = await s.json<{ serviceId?: unknown; problemHe?: unknown }>(prompt, {
      images: photos.slice(0, 3),
      modelTier: "default",
    });
    const id = typeof out?.serviceId === "string" && services.some((x) => x.id === out.serviceId) ? out.serviceId : null;
    const problemHe = typeof out?.problemHe === "string" ? out.problemHe.slice(0, 140) : "";
    return { serviceId: id, problemHe };
  } catch {
    return null;
  }
}
