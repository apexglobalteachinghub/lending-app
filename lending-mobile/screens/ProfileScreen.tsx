import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { z } from "zod";
import { openSupportOnWeb } from "../services/webLink";
import { registerPushForUser } from "../services/push";
import { supabase } from "../services/supabase";
import { useAuthStore } from "../store/authStore";

const profileSchema = z.object({
  mobile_number: z.string().min(8, "Enter your mobile number"),
  address: z.string().min(8, "Enter your full address"),
  reference_person_mobile: z.string().min(8, "Reference person contact number"),
  reference_relationship: z.string().min(2, "Describe the relationship"),
});

type ProfileForm = z.infer<typeof profileSchema>;

export function ProfileScreen() {
  const profile = useAuthStore((s) => s.profile);
  const setSession = useAuthStore((s) => s.setSession);
  const setProfile = useAuthStore((s) => s.setProfile);
  const [pushBusy, setPushBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      mobile_number: "",
      address: "",
      reference_person_mobile: "",
      reference_relationship: "",
    },
  });

  useEffect(() => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "mobile_number, address, reference_person_mobile, reference_relationship"
        )
        .eq("id", profile.id)
        .single();
      if (cancelled) return;
      setLoading(false);
      if (error || !data) return;
      form.reset({
        mobile_number: data.mobile_number ?? "",
        address: data.address ?? "",
        reference_person_mobile: data.reference_person_mobile ?? "",
        reference_relationship: data.reference_relationship ?? "",
      });
    })();
    return () => {
      cancelled = true;
    };
    // form.reset from useForm is stable; reload when the signed-in user changes
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-fetch when profile id changes
  }, [profile?.id]);

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }

  async function enablePush() {
    if (!profile?.id) return;
    setPushBusy(true);
    try {
      await registerPushForUser(profile.id);
      Alert.alert("Notifications", "Push token registered for due-date reminders.");
    } finally {
      setPushBusy(false);
    }
  }

  async function onSave(values: ProfileForm) {
    if (!profile?.id) return;
    const { error } = await supabase
      .from("profiles")
      .update({
        mobile_number: values.mobile_number,
        address: values.address,
        reference_person_mobile: values.reference_person_mobile,
        reference_relationship: values.reference_relationship,
      })
      .eq("id", profile.id);
    if (error) {
      Alert.alert("Error", error.message);
      return;
    }
    setProfile({
      ...profile,
      ...values,
    });
    Alert.alert("Saved", "Your information was updated.");
  }

  return (
    <ScrollView className="flex-1 bg-zinc-50 dark:bg-zinc-950">
      <View className="p-4 pb-10">
        <View className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <Text className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Signed in as
          </Text>
          <Text className="mt-1 text-lg font-semibold text-zinc-900 dark:text-white">
            {profile?.email ?? "—"}
          </Text>
        </View>

        <Text className="mb-2 mt-6 text-base font-semibold text-zinc-900 dark:text-white">
          Your information
        </Text>
        <Text className="mb-4 text-xs text-zinc-500">
          Same details as registration. Staff can view this on the web under Customers.
        </Text>

        {loading ? (
          <Text className="text-sm text-zinc-500">Loading…</Text>
        ) : (
          <View className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <FormField label="Mobile number" error={form.formState.errors.mobile_number?.message}>
              <Controller
                control={form.control}
                name="mobile_number"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="mt-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                    keyboardType="phone-pad"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    placeholderTextColor="#a1a1aa"
                  />
                )}
              />
            </FormField>
            <FormField label="Address" error={form.formState.errors.address?.message}>
              <Controller
                control={form.control}
                name="address"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="mt-1 min-h-[88px] rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                    multiline
                    textAlignVertical="top"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    placeholderTextColor="#a1a1aa"
                  />
                )}
              />
            </FormField>
            <FormField
              label="Reference person number"
              error={form.formState.errors.reference_person_mobile?.message}
            >
              <Controller
                control={form.control}
                name="reference_person_mobile"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="mt-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                    keyboardType="phone-pad"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    placeholderTextColor="#a1a1aa"
                  />
                )}
              />
            </FormField>
            <FormField
              label="Relationship to reference person"
              error={form.formState.errors.reference_relationship?.message}
            >
              <Controller
                control={form.control}
                name="reference_relationship"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="mt-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    placeholderTextColor="#a1a1aa"
                  />
                )}
              />
            </FormField>
            <Pressable
              className="mt-2 items-center rounded-xl bg-emerald-600 py-3.5 active:opacity-90"
              onPress={form.handleSubmit(onSave)}
              disabled={form.formState.isSubmitting}
            >
              <Text className="text-base font-semibold text-white">Save information</Text>
            </Pressable>
          </View>
        )}

        <Pressable
          className="mt-6 items-center rounded-xl bg-emerald-600 py-3.5 active:opacity-90"
          onPress={() => void openSupportOnWeb()}
        >
          <Text className="text-base font-semibold text-white">Contact support (open web)</Text>
        </Pressable>

        <Pressable
          className="mt-3 items-center rounded-xl border border-zinc-300 py-3.5 dark:border-zinc-600"
          onPress={() => void enablePush()}
          disabled={pushBusy}
        >
          <Text className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
            {pushBusy ? "Working…" : "Register push reminders"}
          </Text>
        </Pressable>

        <Pressable
          className="mt-8 items-center rounded-xl bg-zinc-200 py-3.5 dark:bg-zinc-800"
          onPress={() => void signOut()}
        >
          <Text className="text-base font-semibold text-zinc-900 dark:text-white">Sign out</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function FormField({
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
