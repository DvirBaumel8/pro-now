import React, { useCallback, useRef } from "react";
import { ScrollView, View, type StyleProp, type ViewStyle } from "react-native";

/**
 * A horizontally scrolling row that starts on the RIGHT.
 *
 * THE BUG THIS EXISTS TO PREVENT, because it is subtle and it shipped: this
 * app produces Hebrew RTL with `flexDirection: "row-reverse"` inside an
 * LTR document (see the note in the preview's index.html — a dir="rtl"
 * document makes react-native-web flip a second time). Vertical layouts are
 * fine. A horizontal SCROLLER is not: the first item lands at the far right
 * of the content box, the scroller opens at scrollLeft = 0 on the left, and
 * the customer's first card — the most available service, the one the whole
 * section exists to show — is off screen behind the edge. What they see
 * instead is the last card, cropped.
 *
 * So the row lays itself out right-to-left and jumps to the end without
 * animation the moment it knows how wide it is. `onContentSizeChange` fires
 * before paint, so nothing is ever visibly scrolled.
 */
export function RtlRow({
  children,
  style,
  contentContainerStyle,
  gutter = 0,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  /**
   * Side margin, as real spacer views rather than container padding.
   *
   * `paddingHorizontal` on the content container survives a normal scroll
   * but not `scrollToEnd`, which lands on the content's outer edge and
   * swallows the padding on that side — so the first card sat flush against
   * the screen edge while every other card had breathing room. A spacer is
   * a child, and children cannot be scrolled past.
   */
  gutter?: number;
}) {
  const ref = useRef<ScrollView>(null);

  const toEnd = useCallback(() => {
    ref.current?.scrollToEnd({ animated: false });
  }, []);

  return (
    <ScrollView
      ref={ref}
      horizontal
      showsHorizontalScrollIndicator={false}
      onContentSizeChange={toEnd}
      onLayout={toEnd}
      style={style}
      contentContainerStyle={[{ flexDirection: "row-reverse" }, contentContainerStyle]}
    >
      {gutter > 0 ? <View style={{ width: gutter }} /> : null}
      {children}
      {gutter > 0 ? <View style={{ width: gutter }} /> : null}
    </ScrollView>
  );
}
