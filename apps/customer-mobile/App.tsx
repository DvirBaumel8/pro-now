import React from "react";
import { View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";

import { customerTheme } from "@pro-now/ui";

import type { CustomerStackParamList } from "./src/navigation/types";
import { AvatarProvider, useAvatar } from "./src/avatar/AvatarProvider";
import { AvatarPickerScreen } from "./src/screens/AvatarPickerScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { ServiceSelectScreen } from "./src/screens/ServiceSelectScreen";
import { RequestDetailsScreen } from "./src/screens/RequestDetailsScreen";
import { SearchingScreen } from "./src/screens/SearchingScreen";
import { MatchScreen } from "./src/screens/MatchScreen";
import { TrackingScreen } from "./src/screens/TrackingScreen";
import { QuoteScreen } from "./src/screens/QuoteScreen";
import { CompleteScreen } from "./src/screens/CompleteScreen";
import { ReviewScreen } from "./src/screens/ReviewScreen";

const Stack = createNativeStackNavigator<CustomerStackParamList>();

/**
 * PRO NOW — Customer app entry point. Screen order mirrors
 * /docs/02-UX-FLOWS.md §Customer screens (C04-C15). RTL is Hebrew-first
 * via `row-reverse` rather than I18nManager — see /docs/03-DESIGN-SYSTEM.md.
 */

/**
 * WHICH SCREEN OPENS, AND WHY IT WAITS A FRAME TO DECIDE.
 *
 * A customer who has never chosen a figure meets the picker first; one who
 * already chose — or already declined — goes straight home and is never
 * asked again (`../avatar/store.ts` explains why those are different).
 *
 * Reading that preference takes a moment, and mounting Home first and then
 * pushing the picker over it would flash the home screen on every cold
 * start. So the tree holds on a plain background until storage answers.
 * This is the one place in the app where showing nothing is correct: there
 * is genuinely nothing yet to be right about.
 */
function Root() {
  const { loaded, offerPicker } = useAvatar();

  if (!loaded) {
    return <View style={{ flex: 1, backgroundColor: customerTheme.colors.bg }} />;
  }

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName={offerPicker ? "AvatarPicker" : "Home"}
      >
        <Stack.Screen name="AvatarPicker" component={AvatarPickerScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="ServiceSelect" component={ServiceSelectScreen} options={{ headerShown: true, title: "" }} />
        <Stack.Screen name="RequestDetails" component={RequestDetailsScreen} options={{ headerShown: true, title: "" }} />
        <Stack.Screen name="Searching" component={SearchingScreen} />
        <Stack.Screen name="Match" component={MatchScreen} />
        <Stack.Screen name="Tracking" component={TrackingScreen} />
        <Stack.Screen name="Quote" component={QuoteScreen} />
        <Stack.Screen name="Complete" component={CompleteScreen} />
        <Stack.Screen name="Review" component={ReviewScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AvatarProvider>
      <Root />
    </AvatarProvider>
  );
}
