import { useMemo, useRef, useState } from "react";
import { Animated, PanResponder, type LayoutChangeEvent } from "react-native";

/**
 * A HANDLE THAT DOES WHAT A HANDLE SAYS.
 *
 * Amit, after people tried the app: *"יש הרבה מסכים שנראים כמו מסך גלילה
 * למעלה-למטה, ואי אפשר לגלול ולא נפתח כלום."* A grabber on a drawer is a
 * promise that it can be pulled. This keeps the promise, the same way
 * everywhere:
 *
 *  - a drawer that belongs to the screen (the match card, the "on the way"
 *    drawer, the visit sheet) is pulled DOWN to fold it away to a strip and
 *    UP to bring it back; a tap on the handle does the same;
 *  - a pop-up sheet (`onDismiss`) is pulled down to close.
 *
 * `bind` goes on the handle area; `y` is added to the drawer's translateY;
 * `measure` goes on the drawer's onLayout so it knows how far it can fold.
 */
export function useSheetDrag({ peek = 64, onDismiss }: { peek?: number; onDismiss?: () => void } = {}) {
  const y = useRef(new Animated.Value(0)).current;
  const at = useRef(0);
  const height = useRef(0);
  const [folded, setFolded] = useState(false);
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  const settle = (to: number) => {
    at.current = to;
    setFolded(to > 0);
    Animated.spring(y, { toValue: to, useNativeDriver: true, bounciness: 4, speed: 16 }).start();
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_, g) => {
          y.setValue(Math.max(-12, at.current + g.dy));
        },
        onPanResponderRelease: (_, g) => {
          const fold = Math.max(0, height.current - peek);
          const now = at.current + g.dy;
          /* A tap on the handle flips it. */
          if (Math.abs(g.dy) < 5) {
            if (dismissRef.current) return settle(0);
            return settle(at.current > 0 ? 0 : fold);
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
        },
        onPanResponderTerminate: () => settle(at.current),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const measure = (e: LayoutChangeEvent) => {
    height.current = e.nativeEvent.layout.height;
  };

  return { y, bind: responder.panHandlers, measure, folded, open: () => settle(0) };
}
