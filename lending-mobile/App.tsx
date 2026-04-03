import "./global.css";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useColorScheme } from "react-native";
import { useCallback, useEffect } from "react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { MainTabs } from "./navigation/MainTabs";
import type { RootStackParamList } from "./navigation/types";
import { LoginScreen } from "./screens/LoginScreen";
import { supabase } from "./services/supabase";
import { registerPushForUser } from "./services/push";
import { useAuthStore } from "./store/authStore";

SplashScreen.preventAutoHideAsync().catch(() => {});

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const scheme = useColorScheme();
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const initialized = useAuthStore((s) => s.initialized);
  const setSession = useAuthStore((s) => s.setSession);
  const setProfile = useAuthStore((s) => s.setProfile);
  const setInitialized = useAuthStore((s) => s.setInitialized);

  const syncProfile = useCallback(
    async (userId: string) => {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, email, role, mobile_number, address, reference_person_mobile, reference_relationship"
        )
        .eq("id", userId)
        .single();
      if (error || !data) {
        setProfile(null);
        return;
      }
      if (data.role !== "customer") {
        await supabase.auth.signOut();
        setSession(null);
        setProfile(null);
        return;
      }
      setProfile({
        id: data.id,
        email: data.email,
        role: "customer",
        mobile_number: data.mobile_number,
        address: data.address,
        reference_person_mobile: data.reference_person_mobile,
        reference_relationship: data.reference_relationship,
      });
      void registerPushForUser(data.id);
    },
    [setProfile, setSession]
  );

  useEffect(() => {
    let active = true;

    const finishBoot = async () => {
      try {
        await SplashScreen.hideAsync();
      } catch {
        /* already hidden or unavailable */
      }
      if (active) setInitialized(true);
    };

    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!active) return;
        if (error) {
          console.warn("getSession:", error.message);
          setSession(null);
          setProfile(null);
        } else {
          const s = data.session;
          setSession(s);
          if (s?.user) {
            try {
              await syncProfile(s.user.id);
            } catch (e) {
              console.warn("syncProfile:", e);
              setProfile(null);
            }
          } else {
            setProfile(null);
          }
        }
      } catch (e) {
        console.warn("Auth bootstrap:", e);
        if (active) {
          setSession(null);
          setProfile(null);
        }
      } finally {
        await finishBoot();
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) void syncProfile(s.user.id);
      else setProfile(null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [setInitialized, setProfile, setSession, syncProfile]);

  const authed = Boolean(session && profile?.role === "customer");

  const navigationTheme =
    scheme === "dark"
      ? {
          ...DarkTheme,
          colors: { ...DarkTheme.colors, primary: "#10b981", background: "#09090b" },
        }
      : {
          ...DefaultTheme,
          colors: { ...DefaultTheme.colors, primary: "#059669", background: "#fafafa" },
        };

  if (!initialized) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <NavigationContainer theme={navigationTheme}>
          <StatusBar style={scheme === "dark" ? "light" : "dark"} />
          <Stack.Navigator
            key={authed ? "main" : "login"}
            screenOptions={{ headerShown: false }}
          >
            {authed ? (
              <Stack.Screen name="Main" component={MainTabs} />
            ) : (
              <Stack.Screen name="Login" component={LoginScreen} />
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
