"use client";

import { Button } from "@/components/ui/button";
import { Card, CardTitle, CardValue } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import type { DateRangePreset, Loan, Payment } from "@/lib/types";
import {
  exportKpiCsv,
  formatMoney,
  parseRange,
  toISODate,
} from "@/lib/utils";
import {
  eachDayOfInterval,
  format,
  isBefore,
  isWithinInterval,
  parseISO,
  startOfMonth,
} from "date-fns";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = ["#10b981", "#6366f1", "#f59e0b", "#ef4444"];

function num(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") return parseFloat(v) || 0;
  return 0;
}

export function DashboardClient() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState<DateRangePreset>("30d");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [live, setLive] = useState(true);

  const range = useMemo(() => {
    const cs = customStart ? parseISO(customStart) : null;
    const ce = customEnd ? parseISO(customEnd) : null;
    return parseRange(
      preset === "custom" ? "custom" : preset,
      cs,
      ce
    );
  }, [preset, customStart, customEnd]);

  const load = useCallback(async () => {
    const supabase = createClient();
    setLoading(true);
    const { data: l } = await supabase
      .from("loans")
      .select("*")
      .order("created_at", { ascending: false });
    const { data: p } = await supabase
      .from("payments")
      .select("*")
      .order("payment_date", { ascending: false });
    setLoans((l as Loan[]) ?? []);
    setPayments((p as Payment[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!live) return;
    const supabase = createClient();
    const ch = supabase
      .channel("dash-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "loans" },
        () => void load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments" },
        () => void load()
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [live, load]);

  const today = useMemo(() => new Date(), []);

  const kpis = useMemo(() => {
    const inRange = (d: string) => {
      const dt = parseISO(d);
      return isWithinInterval(dt, { start: range.start, end: range.end });
    };

    const released = loans
      .filter((x) => ["approved", "paid"].includes(x.status))
      .reduce((s, x) => s + num(x.amount), 0);

    const active = loans.filter(
      (x) => x.status === "pending" || x.status === "approved"
    ).length;

    const paymentsInRange = payments.filter((p) => inRange(p.payment_date));
    const collected = paymentsInRange.reduce((s, p) => s + num(p.amount_paid), 0);

    const overdue = loans.filter((x) => {
      if (x.status === "paid" || x.status === "rejected") return false;
      return isBefore(parseISO(x.due_date), today);
    }).length;

    const monthStart = startOfMonth(today);
    const monthlyRevenue = payments
      .filter((p) => !isBefore(parseISO(p.payment_date), monthStart))
      .reduce((s, p) => s + num(p.amount_paid), 0);

    const loansCreatedInRange = loans.filter((l) => inRange(l.created_at));

    return {
      released,
      active,
      collected,
      overdue,
      monthlyRevenue,
      loansCreatedInRange,
      paymentsInRange,
    };
  }, [loans, payments, range, today]);

  const loanTrendData = useMemo(() => {
    const days = eachDayOfInterval({
      start: range.start,
      end: range.end,
    });
    return days.map((day) => {
      const key = toISODate(day);
      const count = loans.filter(
        (l) => format(parseISO(l.created_at), "yyyy-MM-dd") === key
      ).length;
      const volume = loans
        .filter(
          (l) =>
            format(parseISO(l.created_at), "yyyy-MM-dd") === key &&
            ["approved", "paid"].includes(l.status)
        )
        .reduce((s, l) => s + num(l.amount), 0);
      return { date: format(day, "MMM d"), count, volume };
    });
  }, [loans, range.end, range.start]);

  const paymentBarData = useMemo(() => {
    const days = eachDayOfInterval({
      start: range.start,
      end: range.end,
    });
    return days.map((day) => {
      const key = toISODate(day);
      const amount = payments
        .filter((p) => p.payment_date === key)
        .reduce((s, p) => s + num(p.amount_paid), 0);
      return { date: format(day, "MMM d"), amount };
    });
  }, [payments, range.end, range.start]);

  const statusPie = useMemo(() => {
    const m: Record<string, number> = {};
    for (const l of loans) {
      m[l.status] = (m[l.status] ?? 0) + 1;
    }
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  }, [loans]);

  function handleExportCsv() {
    exportKpiCsv([
      {
        metric: "Total released (principal)",
        value: kpis.released,
      },
      { metric: "Active loans (count)", value: kpis.active },
      {
        metric: "Payments in range",
        value: kpis.collected,
      },
      { metric: "Overdue loans", value: kpis.overdue },
      { metric: "Monthly revenue", value: kpis.monthlyRevenue },
    ]);
  }

  if (loading && !loans.length) {
    return (
      <div className="grid animate-pulse gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-28 rounded-2xl bg-zinc-200/80 dark:bg-zinc-800"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            KPI Dashboard
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Live lending metrics with date filters and realtime sync.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={preset === "7d" ? "primary" : "secondary"}
            onClick={() => setPreset("7d")}
          >
            7 days
          </Button>
          <Button
            variant={preset === "30d" ? "primary" : "secondary"}
            onClick={() => setPreset("30d")}
          >
            30 days
          </Button>
          <Button
            variant={preset === "custom" ? "primary" : "secondary"}
            onClick={() => setPreset("custom")}
          >
            Custom
          </Button>
          <Button variant="ghost" onClick={() => setLive((v) => !v)}>
            Realtime: {live ? "on" : "off"}
          </Button>
          <Button variant="secondary" onClick={handleExportCsv}>
            Export CSV
          </Button>
        </div>
      </div>

      {preset === "custom" && (
        <Card className="flex flex-wrap gap-4">
          <div>
            <Label htmlFor="start">Start</Label>
            <Input
              id="start"
              type="date"
              className="mt-1 w-44"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="end">End</Label>
            <Input
              id="end"
              type="date"
              className="mt-1 w-44"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
            />
          </div>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardTitle>Loan amount released</CardTitle>
          <CardValue>{formatMoney(kpis.released)}</CardValue>
          <p className="mt-1 text-xs text-zinc-400">Approved + paid principal</p>
        </Card>
        <Card>
          <CardTitle>Active loans</CardTitle>
          <CardValue>{kpis.active}</CardValue>
          <p className="mt-1 text-xs text-zinc-400">Pending or approved</p>
        </Card>
        <Card>
          <CardTitle>Payments (range)</CardTitle>
          <CardValue>{formatMoney(kpis.collected)}</CardValue>
          <p className="mt-1 text-xs text-zinc-400">In selected period</p>
        </Card>
        <Card>
          <CardTitle>Overdue loans</CardTitle>
          <CardValue>{kpis.overdue}</CardValue>
          <p className="mt-1 text-xs text-zinc-400">Past due & not paid</p>
        </Card>
        <Card>
          <CardTitle>Monthly revenue</CardTitle>
          <CardValue>{formatMoney(kpis.monthlyRevenue)}</CardValue>
          <p className="mt-1 text-xs text-zinc-400">Payments this month</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle className="!text-base !font-semibold !text-zinc-900 dark:!text-white">
            Loan trends
          </CardTitle>
          <p className="mb-4 text-xs text-zinc-500">New loans & released volume</p>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={loanTrendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-800" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #e4e4e7",
                  }}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="count"
                  name="New loans"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="volume"
                  name="Released (PHP)"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardTitle className="!text-base !font-semibold !text-zinc-900 dark:!text-white">
            Payment collection
          </CardTitle>
          <p className="mb-4 text-xs text-zinc-500">By day in range</p>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paymentBarData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-800" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="amount" name="Collected" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardTitle className="!text-base !font-semibold !text-zinc-900 dark:!text-white">
            Loan status distribution
          </CardTitle>
          <div className="mx-auto h-72 max-w-md">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusPie}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {statusPie.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
