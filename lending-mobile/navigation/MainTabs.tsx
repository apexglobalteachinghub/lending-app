import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { LoansScreen } from "../screens/LoansScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { SupportScreen } from "../screens/SupportScreen";
import type { MainTabParamList } from "./types";

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerTitleAlign: "center",
        tabBarActiveTintColor: "#059669",
        tabBarInactiveTintColor: "#71717a",
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
      }}
    >
      <Tab.Screen
        name="Loans"
        component={LoansScreen}
        options={{ title: "My loans", tabBarLabel: "Loans" }}
      />
      <Tab.Screen
        name="Support"
        component={SupportScreen}
        options={{ title: "Support", tabBarLabel: "Support" }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: "Profile", tabBarLabel: "Profile" }}
      />
    </Tab.Navigator>
  );
}
