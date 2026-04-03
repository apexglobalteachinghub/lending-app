import { zodResolver } from "@hookform/resolvers/zod";
import { useState, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { z } from "zod";
import { supabase } from "../services/supabase";
import { useAuthStore } from "../store/authStore";

const signInSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "At least 6 characters"),
});

const registerSchema = signInSchema.extend({
  mobile_number: z.string().min(8, "Enter your mobile number"),
  address: z.string().min(8, "Enter your full address"),
  reference_person_mobile: z.string().min(8, "Reference person contact number"),
  reference_relationship: z.string().min(2, "Describe your relationship (e.g. spouse, parent)"),
});

type SignInForm = z.infer<typeof signInSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

type Mode = "signin" | "register";

export function LoginScreen() {
  const setProfile = useAuthStore((s) => s.setProfile);
  const setSession = useAuthStore((s) => s.setSession);
  const [mode, setMode] = useState<Mode>("signin");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const signInForm = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      mobile_number: "",
      address: "",
      reference_person_mobile: "",
      reference_relationship: "",
    },
  });

  async function mapProfile(userId: string) {
    const { data: prof, error: pErr } = await supabase
      .from("profiles")
      .select(
        "id, email, role, mobile_number, address, reference_person_mobile, reference_relationship"
      )
      .eq("id", userId)
      .single();

    if (pErr || !prof) return null;
    if (prof.role !== "customer") return null;

    return {
      id: prof.id,
      email: prof.email,
      role: "customer" as const,
      mobile_number: prof.mobile_number,
      address: prof.address,
      reference_person_mobile: prof.reference_person_mobile,
      reference_relationship: prof.reference_relationship,
    };
  }

  async function onSignIn(values: SignInForm) {
    setSubmitError(null);
    const { data, error } = await supabase.auth.signInWithPassword(values);
    if (error) {
      setSubmitError(error.message);
      return;
    }
    const session = data.session;
    if (!session?.user) {
      setSubmitError("No session");
      return;
    }

    const mapped = await mapProfile(session.user.id);
    if (!mapped) {
      await supabase.auth.signOut();
      Alert.alert(
        "Use the web app",
        "Admin and staff accounts sign in at the LendFlow console in the browser."
      );
      return;
    }

    setSession(session);
    setProfile(mapped);
  }

  async function onRegister(values: RegisterForm) {
    setSubmitError(null);
    const { email, password, mobile_number, address, reference_person_mobile, reference_relationship } =
      values;

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setSubmitError(error.message);
      return;
    }

    const userId = data.user?.id;
    if (!userId) {
      setSubmitError("Could not create account");
      return;
    }

    if (data.session) {
      const { error: upErr } = await supabase
        .from("profiles")
        .update({
          mobile_number,
          address,
          reference_person_mobile,
          reference_relationship,
        })
        .eq("id", userId);

      if (upErr) {
        setSubmitError(upErr.message);
        return;
      }

      const mapped = await mapProfile(userId);
      if (mapped) {
        setSession(data.session);
        setProfile(mapped);
      }
      return;
    }

    Alert.alert(
      "Verify your email",
      "We sent you a confirmation link. After you verify, sign in and open Profile to add or confirm your mobile number, address, and reference person details if needed."
    );
    setMode("signin");
    registerForm.reset();
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-emerald-50 dark:bg-zinc-950"
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingVertical: 32 }}
      >
        <Text className="text-center text-3xl font-bold text-emerald-800 dark:text-emerald-400">
          LendFlow
        </Text>
        <Text className="mt-2 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Customer access
        </Text>

        <View className="mt-6 flex-row rounded-xl bg-zinc-200/80 p-1 dark:bg-zinc-800">
          <Pressable
            className={`flex-1 rounded-lg py-2.5 ${mode === "signin" ? "bg-white shadow-sm dark:bg-zinc-900" : ""}`}
            onPress={() => {
              setMode("signin");
              setSubmitError(null);
            }}
          >
            <Text
              className={`text-center text-sm font-semibold ${mode === "signin" ? "text-emerald-800 dark:text-emerald-400" : "text-zinc-500"}`}
            >
              Sign in
            </Text>
          </Pressable>
          <Pressable
            className={`flex-1 rounded-lg py-2.5 ${mode === "register" ? "bg-white shadow-sm dark:bg-zinc-900" : ""}`}
            onPress={() => {
              setMode("register");
              setSubmitError(null);
            }}
          >
            <Text
              className={`text-center text-sm font-semibold ${mode === "register" ? "text-emerald-800 dark:text-emerald-400" : "text-zinc-500"}`}
            >
              Register
            </Text>
          </Pressable>
        </View>

        {mode === "signin" ? (
          <View className="mt-8 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <Field label="Email" error={signInForm.formState.errors.email?.message}>
              <Controller
                control={signInForm.control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="mt-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    placeholder="you@email.com"
                    placeholderTextColor="#a1a1aa"
                  />
                )}
              />
            </Field>
            <Field label="Password" error={signInForm.formState.errors.password?.message}>
              <Controller
                control={signInForm.control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="mt-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                    secureTextEntry
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    placeholder="••••••••"
                    placeholderTextColor="#a1a1aa"
                  />
                )}
              />
            </Field>
            {submitError ? <Text className="mt-3 text-sm text-red-600">{submitError}</Text> : null}
            <Pressable
              className="mt-6 items-center rounded-xl bg-emerald-600 py-3.5 active:opacity-90"
              onPress={signInForm.handleSubmit(onSignIn)}
              disabled={signInForm.formState.isSubmitting}
            >
              <Text className="text-base font-semibold text-white">Sign in</Text>
            </Pressable>
          </View>
        ) : (
          <View className="mt-8 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <Text className="mb-4 text-xs text-zinc-500">
              Create your account. You will use the same email and password to sign in.
            </Text>
            <Field label="Email" error={registerForm.formState.errors.email?.message}>
              <Controller
                control={registerForm.control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="mt-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    placeholder="you@email.com"
                    placeholderTextColor="#a1a1aa"
                  />
                )}
              />
            </Field>
            <Field label="Password" error={registerForm.formState.errors.password?.message}>
              <Controller
                control={registerForm.control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="mt-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                    secureTextEntry
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    placeholder="At least 6 characters"
                    placeholderTextColor="#a1a1aa"
                  />
                )}
              />
            </Field>
            <Field label="Mobile number" error={registerForm.formState.errors.mobile_number?.message}>
              <Controller
                control={registerForm.control}
                name="mobile_number"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="mt-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                    keyboardType="phone-pad"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    placeholder="+63 …"
                    placeholderTextColor="#a1a1aa"
                  />
                )}
              />
            </Field>
            <Field label="Address" error={registerForm.formState.errors.address?.message}>
              <Controller
                control={registerForm.control}
                name="address"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="mt-1 min-h-[80px] rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                    multiline
                    textAlignVertical="top"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    placeholder="Street, city, province…"
                    placeholderTextColor="#a1a1aa"
                  />
                )}
              />
            </Field>
            <Field
              label="Reference person number"
              error={registerForm.formState.errors.reference_person_mobile?.message}
            >
              <Controller
                control={registerForm.control}
                name="reference_person_mobile"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="mt-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                    keyboardType="phone-pad"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    placeholder="Their mobile / phone"
                    placeholderTextColor="#a1a1aa"
                  />
                )}
              />
            </Field>
            <Field
              label="Relationship to reference person"
              error={registerForm.formState.errors.reference_relationship?.message}
            >
              <Controller
                control={registerForm.control}
                name="reference_relationship"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="mt-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    placeholder="e.g. Spouse, parent, sibling"
                    placeholderTextColor="#a1a1aa"
                  />
                )}
              />
            </Field>
            {submitError ? <Text className="mt-3 text-sm text-red-600">{submitError}</Text> : null}
            <Pressable
              className="mt-6 items-center rounded-xl bg-emerald-600 py-3.5 active:opacity-90"
              onPress={registerForm.handleSubmit(onRegister)}
              disabled={registerForm.formState.isSubmitting}
            >
              <Text className="text-base font-semibold text-white">Create account</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</Text>
      {children}
      {error ? <Text className="mt-1 text-xs text-red-600">{error}</Text> : null}
    </View>
  );
}
