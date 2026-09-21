import { AVATARS, type AvatarChoice } from "@pro-now/types";

/**
 * WHO THE CUSTOMER IS IN THE WORLD, KEPT BETWEEN LAUNCHES.
 *
 * ---------------------------------------------------------------------
 * WHY ANY OF THIS EXISTS
 * ---------------------------------------------------------------------
 * Amit: *"אני רוצה שהלקוח יגדיר לעצמו אווטאר בהתחלה... פשוט ממש, שלוקח 20
 * שניות עד דקה, שלא ידלגו — לא חובה."*
 *
 * Twenty seconds is cheap once. Twenty seconds every single time the app
 * is opened is a toll, and a toll on the second screen is how an install
 * becomes an uninstall. So the choice is written down.
 *
 * ---------------------------------------------------------------------
 * WHY THE READ IS SO SUSPICIOUS OF WHAT IT FINDS
 * ---------------------------------------------------------------------
 * What comes back from device storage is a string somebody's phone kept
 * across an app update. It can be an avatar that was retired when the set
 * was cut from sixteen to twelve, a half-written value from a crash, or
 * "undefined" from an older build. None of those are unlikely, and all of
 * them arrive as a `string` that TypeScript is perfectly happy with.
 *
 * So the stored id is checked against the real set every time. Anything
 * unrecognised becomes `null` — which is the skip state, a first-class
 * answer every screen downstream already draws correctly — rather than an
 * id that will fail to find art and leave an invisible customer walking
 * down the street.
 */
export const AVATAR_STORAGE_KEY = "pronow.customer.avatar.v1";

/** What we hand the storage layer. `null` means "they chose nobody". */
export function encodeAvatar(choice: AvatarChoice): string {
  return choice ?? "";
}

/**
 * What we make of whatever the device gives back.
 *
 * Unknown in, skip out. Never a guess, and never an id that art cannot
 * resolve.
 */
export function decodeAvatar(raw: string | null | undefined): AvatarChoice {
  if (!raw) return null;
  const known = AVATARS.some((a) => a.id === raw);
  return known ? (raw as AvatarChoice) : null;
}

/**
 * Whether the picker should be shown unprompted.
 *
 * Only when nothing has been decided yet. `null` is ambiguous on its own —
 * it is both "has not chosen" and "chose to skip" — and re-asking somebody
 * who already said no is the exact behaviour Amit's "לא חובה" rules out.
 * So the app distinguishes the two by whether a key exists at all, and
 * writes an empty string on skip so the skip is itself a recorded answer.
 */
export function shouldOfferPicker(rawStored: string | null | undefined): boolean {
  return rawStored === null || rawStored === undefined;
}

/**
 * WHETHER THE THREE-SLIDE EXPLANATION HAS BEEN THROUGH ONCE.
 *
 * A separate key from the avatar's, and separate on purpose. They are two
 * different answers to two different questions — "do you know where you
 * are" and "who are you here" — and the second one can be re-opened from
 * the profile while the first cannot. Sharing one key would mean changing
 * a figure re-explains the product, and a customer who skipped the
 * explanation could never be shown it again after choosing a face.
 *
 * Presence is the whole test, exactly as it is for the avatar: skipping
 * the slides is an answer, so it writes the key too. Amit's rule for the
 * picker — *"שלא ידלגו — לא חובה"* — is the same rule here.
 */
export const INTRO_STORAGE_KEY = "pronow.customer.intro.v1";

export function shouldShowIntro(rawStored: string | null | undefined): boolean {
  return rawStored === null || rawStored === undefined;
}
