import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { supabase } from "../services/supabase";
import { useAuthStore } from "../store/authStore";

export type LoanRow = {
  id: string;
  amount: number;
  interest_rate: number;
  total_amount: number;
  status: string;
  due_date: string;
  created_at: string;
};

function money(n: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function LoansScreen() {
  const userId = useAuthStore((s) => s.profile?.id);
  const [rows, setRows] = useState<LoanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from("loans")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (!error && data) {
      setRows(
        data.map((r) => ({
          ...r,
          amount: Number(r.amount),
          interest_rate: Number(r.interest_rate),
          total_amount: Number(r.total_amount),
        }))
      );
    }
    setLoading(false);
    setRefreshing(false);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel("mobile-loans")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "loans", filter: `user_id=eq.${userId}` },
        () => void load()
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [userId, load]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-zinc-950">
        <ActivityIndicator color="#059669" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-zinc-50 dark:bg-zinc-950">
      <FlatList
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        ItemSeparatorComponent={() => <View className="h-3" />}
        data={rows}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
            tintColor="#059669"
          />
        }
        ListEmptyComponent={
          <Text className="mt-8 text-center text-zinc-500">
            No loans yet. When a loan is created for your account, it will appear here.
          </Text>
        }
        renderItem={({ item }) => (
          <View className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <View className="flex-row justify-between">
              <Text className="text-lg font-semibold text-zinc-900 dark:text-white">
                {money(item.amount)}
              </Text>
              <Text className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium capitalize text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                {item.status}
              </Text>
            </View>
            <Text className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Total due: {money(item.total_amount)}
            </Text>
            <Text className="mt-1 text-xs text-zinc-500">Due {item.due_date}</Text>
          </View>
        )}
      />
    </View>
  );
}
