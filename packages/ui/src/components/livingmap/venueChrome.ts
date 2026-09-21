/**
 * WHAT A SHOP ON THE STREET IS ALLOWED TO SAY ABOUT ITSELF.
 *
 * ---------------------------------------------------------------------
 * WHY THIS IS A FUNCTION AND NOT THREE TERNARIES IN A RENDER
 * ---------------------------------------------------------------------
 * A venue can carry two pieces of type: a SIGN over the door with the
 * professional's name on it, and a CARD above the roof with the name, the
 * trade and whatever history exists. Which of the two is showing is
 * decided by four independent facts, and every time one of them was
 * decided in place, inside the JSX, it was decided slightly wrong:
 *
 *   · The card was drawn while the camera was following the walker, where
 *     the layer cannot know where the screen is, so it hung a quarter of
 *     itself off the right edge of the phone for the whole wait.
 *   · The sign was drawn while the street was still being searched, so
 *     the search screen painted real professionals' names on shopfronts
 *     before dispatch had chosen anybody — a claim about supply, which is
 *     the one thing the world may never make (/CLAUDE.md §3).
 *   · The sign was drawn on dimmed shops at 55% of an already 35% venue,
 *     which is 19%, at which a label is not quiet: it is a smear.
 *   · And when the card stood down for the first of those reasons, the
 *     chosen shop was left with no name at all, because the sign's own
 *     rule was "not on the selected one" rather than "not where the card
 *     already is".
 *
 * Four faults, one question, so it is asked once and it is asked here,
 * where a test can ask it too.
 */
export interface VenueChromeInput {
  /**
   * The street is being searched. Nothing has been decided, so nothing on
   * a building may name anybody.
   */
  muted: boolean;
  /** Another shop is the subject, and this one has receded. */
  dimmed: boolean;
  /** This is the shop the customer is looking at, or has chosen. */
  selected: boolean;
  /**
   * The camera is walking with the customer rather than parked.
   *
   * While it is, the world layer's idea of which part of the world is on
   * screen is stale by construction — the position lives in Animated
   * values so that walking does not re-render the neighbourhood. A card
   * that cannot be clamped to the phone is not drawn.
   */
  cameraFollowing: boolean;
}

export interface VenueChrome {
  /** The card above the roof: name, trade, honest history. */
  card: boolean;
  /** The nameplate over the door. */
  sign: boolean;
}

export function venueChrome({ muted, dimmed, selected, cameraFollowing }: VenueChromeInput): VenueChrome {
  // Nothing at all while we are still asking. See `muted`.
  if (muted) return { card: false, sign: false };

  const card = selected && !cameraFollowing;

  /*
   * The sign identifies a shop whose card is NOT open — so it follows the
   * card rather than the selection, and comes back on the chosen shop the
   * moment the card stands down. A dimmed shop shows nothing: it has
   * receded, and type cannot recede.
   */
  const sign = !card && !dimmed;

  return { card, sign };
}
