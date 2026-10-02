import React from "react";
import { useWindowDimensions, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { IntroBody, customerDarkTheme } from "@pro-now/ui";

import type { CustomerStackParamList } from "../navigation/types";
import { useAvatar } from "../avatar/AvatarProvider";
import { worldSources } from "../world/worldSources";

type Props = NativeStackScreenProps<CustomerStackParamList, "Intro">;

/**
 * C00 — the three slides, in the app people install.
 *
 * Whether they read them or take the skip, the answer is the same to
 * everything downstream: it has been offered once and will not be offered
 * again. See `../avatar/store.ts`, which keeps this answer beside the
 * avatar's for the same reason and in a separate key for a different one.
 *
 * Where it goes next is the picker if the figure has never been chosen,
 * and home otherwise — the explanation is what makes the picker make
 * sense, so it has to come first, but it must not force the picker on
 * somebody who already answered it.
 */
export function IntroScreen({ navigation }: Props) {
  const { width, height } = useWindowDimensions();
  const { offerPicker, markIntroSeen } = useAvatar();

  return (
    <View style={{ flex: 1, backgroundColor: customerDarkTheme.colors.bg }}>
      <IntroBody
        side="CUSTOMER"
        sources={worldSources}
        onDone={() => {
          markIntroSeen();
          navigation.replace(offerPicker ? "AvatarPicker" : "Home");
        }}
        width={width}
        height={height}
      />
    </View>
  );
}
