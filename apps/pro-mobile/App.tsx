import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import type { ProStackParamList } from "./src/navigation/types";
import { OfflineHomeScreen } from "./src/screens/OfflineHomeScreen";
import { PreShiftScreen } from "./src/screens/PreShiftScreen";
import { OfferScreen } from "./src/screens/OfferScreen";
import { ProJobScreen } from "./src/screens/ProJobScreen";
import { ProQuoteScreen } from "./src/screens/ProQuoteScreen";
import { EarningsScreen } from "./src/screens/EarningsScreen";
import { PricingScreen } from "./src/screens/PricingScreen";
import { VerificationCenterScreen } from "./src/screens/VerificationCenterScreen";
import { proTheme } from "@pro-now/ui";

const Stack = createNativeStackNavigator<ProStackParamList>();

/**
 * PRO NOW — Professional app entry point. Screen order mirrors
 * /docs/02-UX-FLOWS.md §Professional daily UX (P13-P24). Dark operational
 * theme per /docs/03-DESIGN-SYSTEM.md §Personality.
 */
export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: proTheme.colors.bg },
        }}
      >
        <Stack.Screen name="Offline" component={OfflineHomeScreen} />
        <Stack.Screen name="PreShift" component={PreShiftScreen} />
        <Stack.Screen name="Offer" component={OfferScreen} />
        <Stack.Screen name="Job" component={ProJobScreen} />
        <Stack.Screen name="Quote" component={ProQuoteScreen} />
        <Stack.Screen name="Earnings" component={EarningsScreen} options={{ headerShown: true, title: "" }} />
        <Stack.Screen name="Pricing" component={PricingScreen} options={{ headerShown: true, title: "" }} />
        <Stack.Screen name="VerificationCenter" component={VerificationCenterScreen} options={{ headerShown: true, title: "" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
