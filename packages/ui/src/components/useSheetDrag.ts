import { useMemo, useRef, useState } from "react";
import { Animated, PanResponder, type LayoutChangeEvent, type PanResponderGestureState } from "react-native";

/**
 * A HANDLE THAT DOES WHAT A HANDLE SAYS.
 *
 * Amit, after people tried the app: *"יש הרבה מסכים שנראים כמו מסך גלילה
 * למעלה-למטה, ואי אפשר לגלול ולא נפתח כלום."* A grabber on a drawer is a
 * promise that it can be pulled. This keeps the promise, the same way
 * everywhere:
 *
 *  - pulled DOWN, a drawer that belongs to the screen folds to a strip so
 *    the city behind it shows; a pop-up sheet (`onDismiss`) closes;
 *  - pulled UP — *"אינטואיטיבית אנשים ישר ניסו לגלול למעלה"* — a folded
 *    drawer unfolds, and an open one opens further (`expanded`) to show
 *    what it keeps below the fold. Down undoes it one step at a time;
 *  - a tap on the handle flips between open and folded.
 *
 * `bind` goes on the handle (it takes taps too); `bindBody` goes on the
 * whole drawer and only claims a clearly vertical drag, so buttons inside
 * still get their taps. `y` is added to the drawer's translateY; `measure`
 * goes on its onLayout so it knows how far it can fold.
 */
export function useSheetDrag({ peek = 64, onDismiss }: { peek?: number; onDismiss?: () => void } = {}) {
  const y = useRef(new Animated.Value(0)).current;
  const at = useRef(0);
  const height = useRef(0);
  const [folded, setFolded] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const expandedRef = useRef(false);
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  const setExp = (v: boolean) => {
    expandedRef.current = v;
    setExpanded(v);
  };
  const settle = (to: number) => {
    at.current = to;
    setFolded(to > 0);
    Animated.spring(y, { toValue: to, useNativeDriver: true, bounciness: 4, speed: 16 }).start();
  };

  const release = (g: PanResponderGestureState, tapFlips: boolean) => {
    const fold = Math.max(0, height.current - peek);
    const now = at.current + g.dy;
    if (Math.abs(g.dy) < 5) {
      if (!tapFlips) return settle(at.current);
      if (expandedRef.current) {
        setExp(false);
        return settle(0);
      }
      if (dismissRef.current) return settle(0);
      /* A tap on the handle opens it — what a handle promises (2026-09-29); pulling down folds. */
      if (at.current > 0) return settle(0);
      setExp(true);
      return settle(0);
    }
    /* Up: unfold, then open further. */
    if (g.dy < -30 || g.vy < -0.5) {
      if (at.current > 0) return settle(0);
      setExp(true);
      return settle(0);
    }
    /* Down from open: close the extra first. */
    if (expandedRef.current && (g.dy > 30 || g.vy > 0.5)) {
      setExp(false);
      return settle(0);
    }
    if (dismissRef.current) {
      if (now > 90 || g.vy > 0.8) {
        Animated.timing(y, { toValue: height.current || 500, duration: 160, useNativeDriver: true }).start(() => {
          y.setValue(0);
          at.current = 0;
          dismissRef.current?.();
        });
        return;
      }
      return settle(0);
    }
    settle(now > fold / 2 || g.vy > 0.6 ? fold : 0);
  };
  const releaseRef = useRef(release);
  releaseRef.current = release;

  const follow = (g: PanResponderGestureState) => {
    /* Down follows the finger; up is resisted a little, then opens. */
    const d = g.dy < 0 ? g.dy * 0.35 : g.dy;
    y.setValue(Math.max(-24, at.current + d));
  };

  const handle = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_, g) => follow(g),
        onPanResponderRelease: (_, g) => releaseRef.current(g, true),
        onPanResponderTerminate: (_, g) => releaseRef.current(g, false),
      }),
    []
  );
  const body = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dy) > 12 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5,
        onPanResponderMove: (_, g) => follow(g),
        onPanResponderRelease: (_, g) => releaseRef.current(g, false),
        onPanResponderTerminate: (_, g) => releaseRef.current(g, false),
      }),
    []
  );

  const measure = (e: LayoutChangeEvent) => {
    height.current = e.nativeEvent.layout.height;
  };

  return {
    y,
    bind: handle.panHandlers,
    bindBody: body.panHandlers,
    measure,
    folded,
    expanded,
    open: () => settle(0),
    /* The same as pulling up — for a button that says so out loud. */
    expand: () => {
      setExp(true);
      settle(0);
    },
    collapse: () => {
      setExp(false);
      settle(0);
    },
  };
}
