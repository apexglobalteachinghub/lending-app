import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { z } from "zod";
import { supabase } from "../services/supabase";
import { openSupportOnWeb, supportWebUrl } from "../services/webLink";
import { useAuthStore } from "../store/authStore";

const schema = z.object({
  message: z.string().min(1, "Enter a message"),
});

type Form = z.infer<typeof schema>;

export function SupportScreen() {
  const userId = useAuthStore((s) => s.profile?.id);
  const [done, setDone] = useState(false);
  const { control, handleSubmit, reset, formState } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { message: "" },
  });

  async function onSubmit(values: Form) {
    if (!userId) return;
    const { error } = await supabase.from("support_messages").insert({
      user_id: userId,
      message: values.message,
      status: "open",
    });
    if (error) {
      Alert.alert("Error", error.message);
      return;
    }
    reset();
    setDone(true);
    Alert.alert("Sent", "Your message was sent to support.", [
      { text: "OK" },
      {
        text: "View on web",
        onPress: () => void openSupportOnWeb(),
      },
    ]);
  }

  return (
    <ScrollView className="flex-1 bg-zinc-50 dark:bg-zinc-950">
      <View className="p-4">
        <Text className="text-lg font-semibold text-zinc-900 dark:text-white">
          Contact support
        </Text>
        <Text className="mt-1 text-sm text-zinc-500">
          We typically reply within one business day. You can also open the support desk in
          your browser.
        </Text>

        <View className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Message
          </Text>
          <Controller
            control={control}
            name="message"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="mt-2 min-h-[120px] rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                multiline
                textAlignVertical="top"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                placeholder="How can we help?"
                placeholderTextColor="#a1a1aa"
              />
            )}
          />
          {formState.errors.message && (
            <Text className="mt-1 text-xs text-red-600">
              {formState.errors.message.message}
            </Text>
          )}

          <Pressable
            className="mt-4 items-center rounded-xl bg-emerald-600 py-3.5 active:opacity-90"
            onPress={handleSubmit(onSubmit)}
            disabled={formState.isSubmitting}
          >
            <Text className="text-base font-semibold text-white">Submit</Text>
          </Pressable>
        </View>

        <Pressable
          className="mt-6 items-center rounded-xl border border-emerald-600 py-3.5 active:bg-emerald-50 dark:active:bg-emerald-950/30"
          onPress={() => void openSupportOnWeb()}
        >
          <Text className="text-base font-semibold text-emerald-700 dark:text-emerald-400">
            View support status (web)
          </Text>
        </Pressable>
        <Text className="mt-2 text-center text-xs text-zinc-400">{supportWebUrl()}</Text>

        {done ? (
          <Text className="mt-4 text-center text-sm text-emerald-700 dark:text-emerald-400">
            Last message submitted successfully.
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
}
