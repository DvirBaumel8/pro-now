import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import type { CustomerStackParamList } from "./src/navigation/types";
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
 * /docs/02-UX-FLOWS.md §Customer screens (C04-C15). RTL is enabled
 * globally in HomeScreen.tsx per /docs/03-DESIGN-SYSTEM.md §RTL.
 */
export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
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
