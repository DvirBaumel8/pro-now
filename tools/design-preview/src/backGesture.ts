/**
 * THE PHONE'S OWN BACK GESTURE, FOR THE WHOLE PROTOTYPE.
 *
 * ---------------------------------------------------------------------
 * THE BUG THIS EXISTS FOR
 * ---------------------------------------------------------------------
 * Amit, reviewing on an Android phone:
 *
 *   "כפתור חזרה למסך קודם לא נמצא בכל מקום. באנדרואיד רצוי שהכפתור הטבעי
 *    שלו למטרה זו גם יעבוד — כרגע זורק החוצה מהאפליקציה."
 *
 * The customer side had already solved this: `go` pushed a history entry
 * and a `popstate` listener turned the phone's back button into the same
 * `back()` the on-screen control used.
 *
 * The listener lived inside `CustomerApp`. Switching to the professional
 * side UNMOUNTS `CustomerApp`, which removes the listener — and nothing
 * on the professional side pushed an entry in the first place, because it
 * navigates with `setProView` and `setTab` rather than through `go`. So
 * on every professional screen the back button had nothing to pop and no
 * one listening, and the browser did the only thing left: left the page.
 *
 * ---------------------------------------------------------------------
 * WHY A MODULE AND NOT A CONTEXT
 * ---------------------------------------------------------------------
 * There is ONE back gesture, and `window.history` is already one global
 * thing. A context would wrap global state in ceremony and still have to
 * be threaded through the shell into both sides. What matters is the rule
 * this enforces, which a context would not have made any truer: the
 * listener belongs to the shell, which is always mounted, and each side
 * registers what "back" means while it is the one on screen.
 *
 * ---------------------------------------------------------------------
 * WHAT IT DELIBERATELY DOES NOT DO
 * ---------------------------------------------------------------------
 * It does not trap the gesture. When a side says it has nowhere left to
 * go, the browser is allowed to leave — this is a web page, and a page
 * you cannot back out of is a worse bug than the one being fixed. What
 * was wrong was leaving while there was still a screen behind you.
 */

/** Returns true if it consumed the gesture, false to let the page go. */
export type BackHandler = () => boolean;

let handler: BackHandler | null = null;

/**
 * Register what "back" means for the side currently on screen.
 *
 * Returns the un-register, so a caller can `useEffect(() => setBackHandler(fn), ...)`
 * and have the handler torn down with the component that owns it.
 */
export function setBackHandler(fn: BackHandler | null): () => void {
  handler = fn;
  return () => {
    if (handler === fn) handler = null;
  };
}

/**
 * Record a step, so there is something for the gesture to pop.
 *
 * The entries are deliberately empty of state: the artifact host strips
 * query strings, so a URL-encoded route would work locally and silently
 * break in the one place Amit actually looks at this.
 */
export function pushBackEntry(): void {
  if (typeof window === "undefined") return;
  window.history.pushState({ proNow: true }, "");
}

/**
 * Install the single listener. Called once by the shell.
 *
 * When the registered handler consumes the gesture the entry it popped is
 * gone, which is correct — one push per navigation, one pop per back.
 */
export function installBackGesture(): () => void {
  if (typeof window === "undefined") return () => {};
  const onPop = () => {
    handler?.();
  };
  window.addEventListener("popstate", onPop);
  return () => window.removeEventListener("popstate", onPop);
}
