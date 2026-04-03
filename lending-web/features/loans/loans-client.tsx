"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loanSchema } from "@/lib/validations";
import { createClient } from "@/lib/supabase/client";
import type { Loan, LoanStatus, Profile } from "@/lib/types";
import { formatMoney } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

type LoanFormIn = z.input<typeof loanSchema>;
type LoanFormOut = z.infer<typeof loanSchema>;

export function LoansClient() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [customers, setCustomers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<LoanFormIn, unknown, LoanFormOut>({
    resolver: zodResolver(loanSchema),
    defaultValues: {
      user_id: "",
      amount: 1000,
      interest_rate: 5,
      due_date: format(new Date(Date.now() + 86400000 * 30), "yyyy-MM-dd"),
    },
  });

  async function refresh() {
    const supabase = createClient();
    setLoading(true);
    const { data: l } = await supabase
      .from("loans")
      .select("*")
      .order("created_at", { ascending: false });
    const { data: p } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "customer")
      .order("email");
    setLoans((l as Loan[]) ?? []);
    setCustomers((p as Profile[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function onSubmit(values: LoanFormOut) {
    setError(null);
    const supabase = createClient();
    const interest = values.interest_rate / 100;
    const total = values.amount * (1 + interest);
    const { error: e } = await supabase.from("loans").insert({
      user_id: values.user_id,
      amount: values.amount,
      interest_rate: values.interest_rate,
      total_amount: Math.round(total * 100) / 100,
      status: "pending" as LoanStatus,
      due_date: values.due_date,
    });
    if (e) {
      setError(e.message);
      return;
    }
    form.reset({ ...form.getValues(), user_id: values.user_id });
    await refresh();
  }

  async function updateStatus(id: string, status: LoanStatus) {
    const supabase = createClient();
    await supabase.from("loans").update({ status }).eq("id", id);
    await refresh();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Loans</h1>
        <p className="text-sm text-zinc-500">Create and manage customer loans.</p>
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
          New loan
        </h2>
        <form
          className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <div className="sm:col-span-2 lg:col-span-1">
            <Label htmlFor="user_id">Customer</Label>
            <select
              id="user_id"
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              {...form.register("user_id")}
            >
              <option value="">Select customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.email ?? c.id.slice(0, 8)}
                </option>
              ))}
            </select>
            {form.formState.errors.user_id && (
              <p className="mt-1 text-xs text-red-600">
                {form.formState.errors.user_id.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="amount">Principal</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              className="mt-1"
              {...form.register("amount")}
            />
          </div>
          <div>
            <Label htmlFor="interest_rate">Interest % (simple)</Label>
            <Input
              id="interest_rate"
              type="number"
              step="0.01"
              className="mt-1"
              {...form.register("interest_rate")}
            />
          </div>
          <div>
            <Label htmlFor="due_date">Due date</Label>
            <Input id="due_date" type="date" className="mt-1" {...form.register("due_date")} />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              Create loan
            </Button>
          </div>
        </form>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </Card>

      <Card className="overflow-x-auto">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
          All loans
        </h2>
        {loading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
                <th className="pb-2 pr-4">Created</th>
                <th className="pb-2 pr-4">User</th>
                <th className="pb-2 pr-4">Amount</th>
                <th className="pb-2 pr-4">Total</th>
                <th className="pb-2 pr-4">Due</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-zinc-100 dark:border-zinc-800/80"
                >
                  <td className="py-3 pr-4 text-zinc-600">
                    {format(new Date(row.created_at), "MMM d, yyyy")}
                  </td>
                  <td className="py-3 pr-4 font-mono text-xs">{row.user_id.slice(0, 8)}…</td>
                  <td className="py-3 pr-4">{formatMoney(Number(row.amount))}</td>
                  <td className="py-3 pr-4">{formatMoney(Number(row.total_amount))}</td>
                  <td className="py-3 pr-4">{row.due_date}</td>
                  <td className="py-3 pr-4 capitalize">{row.status}</td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-1">
                      {(
                        ["pending", "approved", "rejected", "paid"] as LoanStatus[]
                      ).map((s) => (
                        <Button
                          key={s}
                          variant={row.status === s ? "primary" : "ghost"}
                          className="!px-2 !py-1 text-xs capitalize"
                          type="button"
                          onClick={() => void updateStatus(row.id, s)}
                        >
                          {s}
                        </Button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
