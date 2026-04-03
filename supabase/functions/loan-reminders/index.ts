/**
 * Supabase Edge Function: notify borrowers 3 days before loan due_date.
 *
 * Schedule with Supabase Dashboard → Edge Functions → Cron, e.g. daily 08:00 UTC.
 *
 * Secrets:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   EXPO_ACCESS_TOKEN (optional; for higher Expo push rate limits)
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const expoToken = Deno.env.get("EXPO_ACCESS_TOKEN");

  const supabase = createClient(supabaseUrl, serviceKey);

  const target = new Date();
  target.setUTCDate(target.getUTCDate() + 3);
  const y = target.getUTCFullYear();
  const m = String(target.getUTCMonth() + 1).padStart(2, "0");
  const d = String(target.getUTCDate()).padStart(2, "0");
  const dueStr = `${y}-${m}-${d}`;

  const { data: loans, error: loanErr } = await supabase
    .from("loans")
    .select("id, user_id, total_amount, due_date")
    .eq("due_date", dueStr)
    .in("status", ["pending", "approved"]);

  if (loanErr) {
    console.error(loanErr);
    return new Response(JSON.stringify({ error: loanErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!loans?.length) {
    return new Response(JSON.stringify({ sent: 0, message: "No matching loans" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userIds = [...new Set(loans.map((l) => l.user_id))];
  const { data: tokens, error: tokErr } = await supabase
    .from("user_push_tokens")
    .select("user_id, expo_push_token")
    .in("user_id", userIds);

  if (tokErr) {
    console.error(tokErr);
    return new Response(JSON.stringify({ error: tokErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Accept-Encoding": "gzip, deflate",
    "Content-Type": "application/json",
  };
  if (expoToken) headers.Authorization = `Bearer ${expoToken}`;

  const formatPhp = (n: number) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);

  let sent = 0;
  for (const loan of loans) {
    const userTokens = tokens?.filter((t) => t.user_id === loan.user_id) ?? [];
    for (const t of userTokens) {
      const body = {
        to: t.expo_push_token,
        sound: "default",
        title: "Loan payment reminder",
        body: `Your loan of ${formatPhp(Number(loan.total_amount))} is due in 3 days (${loan.due_date}).`,
        data: { loanId: loan.id, type: "due_soon" },
      };
      const res = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      if (res.ok) sent++;
      else console.error(await res.text());
    }
  }

  return new Response(JSON.stringify({ sent, loans: loans.length }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
