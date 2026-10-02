import React from "react";
import { useWindowDimensions, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AvatarPickerBody, customerDarkTheme } from "@pro-now/ui";

import type { CustomerStackParamList } from "../navigation/types";
import { useAvatar } from "../avatar/AvatarProvider";
import { worldSources } from "../world/worldSources";

type Props = NativeStackScreenProps<CustomerStackParamList, "AvatarPicker">;

/**
 * C02b — the picker, in the app people install.
 *
 * It has existed in `packages/ui` for a while and only the design gallery
 * ever rendered it, which meant the shipped app had a world with nobody in
 * it: `avatar` was hard-wired `null` everywhere downstream and the choice
 * Amit specced could not be made at all.
 *
 * Both exits are real answers. Choosing writes an id; skipping writes the
 * skip, so nobody is asked twice — see `../avatar/store.ts`.
 */
export function AvatarPickerScreen({ navigation, route }: Props) {
  const { width, height } = useWindowDimensions();
  const { choice, choose } = useAvatar();

  /*
   * Where to go afterwards. Arriving from onboarding this is the home
   * screen and there is nothing behind us; arriving from the profile it is
   * simply back. `goBack` would strand a first-run customer on the auth
   * screen, so the route says which it is.
   */
  const done = () => {
    if (route.params?.returning && navigation.canGoBack()) navigation.goBack();
    else navigation.replace("Home");
  };

  return (
    <View style={{ flex: 1, backgroundColor: customerDarkTheme.colors.bg }}>
      <AvatarPickerBody
        value={choice}
        sources={worldSources}
        onChoose={(id) => {
          choose(id);
          done();
        }}
        onSkip={() => {
          // A recorded decision, not a deferral.
          choose(null);
          done();
        }}
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
        width={width}
        height={height}
      />
    </View>
  );
}
