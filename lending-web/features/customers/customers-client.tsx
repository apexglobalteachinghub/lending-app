"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import { format } from "date-fns";
import { useCallback, useEffect, useMemo, useState } from "react";

export function CustomersClient() {
  const [rows, setRows] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Profile | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "customer")
      .order("created_at", { ascending: false });
    if (!error && data) {
      setRows(data as Profile[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        (r.email ?? "").toLowerCase().includes(q) ||
        (r.mobile_number ?? "").toLowerCase().includes(q) ||
        (r.address ?? "").toLowerCase().includes(q) ||
        (r.reference_person_mobile ?? "").toLowerCase().includes(q) ||
        (r.reference_relationship ?? "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  function dash(v: string | null | undefined) {
    if (v == null || v === "") return "—";
    return v;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          Customer information
        </h1>
        <p className="text-sm text-zinc-500">
          Registration details: mobile, address, and reference contact. Click a row for full
          details.
        </p>
      </div>

      <Card className="flex flex-wrap gap-4">
        <div className="min-w-[240px] flex-1">
          <Label htmlFor="cust-search">Search</Label>
          <Input
            id="cust-search"
            className="mt-1"
            placeholder="Email, mobile, address, reference…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <Button type="button" variant="secondary" onClick={() => void load()}>
            Refresh
          </Button>
        </div>
      </Card>

      <Card className="overflow-x-auto">
        {loading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : (
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
                <th className="pb-2 pr-4">Email</th>
                <th className="pb-2 pr-4">Mobile</th>
                <th className="pb-2 pr-4">Address</th>
                <th className="pb-2 pr-4">Reference #</th>
                <th className="pb-2 pr-4">Relationship</th>
                <th className="pb-2">Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  className="cursor-pointer border-b border-zinc-100 hover:bg-emerald-50/40 dark:border-zinc-800/80 dark:hover:bg-emerald-950/20"
                  onClick={() => setSelected(r)}
                >
                  <td className="py-3 pr-4">{dash(r.email)}</td>
                  <td className="py-3 pr-4 font-mono text-xs">{dash(r.mobile_number)}</td>
                  <td className="max-w-[200px] truncate py-3 pr-4" title={r.address ?? ""}>
                    {dash(r.address)}
                  </td>
                  <td className="py-3 pr-4 font-mono text-xs">
                    {dash(r.reference_person_mobile)}
                  </td>
                  <td className="py-3 pr-4">{dash(r.reference_relationship)}</td>
                  <td className="py-3 text-zinc-600">
                    {format(new Date(r.created_at), "MMM d, yyyy")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && filtered.length === 0 && (
          <p className="mt-4 text-sm text-zinc-500">No customers match your search.</p>
        )}
      </Card>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="customer-detail-title"
          onClick={() => setSelected(null)}
        >
          <div className="max-h-[90vh] w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <Card className="max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-start justify-between gap-2">
              <h2
                id="customer-detail-title"
                className="text-lg font-semibold text-zinc-900 dark:text-white"
              >
                Customer details
              </h2>
              <Button variant="ghost" className="!px-2 !py-1 text-xs" onClick={() => setSelected(null)}>
                Close
              </Button>
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-xs font-medium text-zinc-500">Email</dt>
                <dd className="mt-0.5 text-zinc-900 dark:text-zinc-100">{dash(selected.email)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-zinc-500">Mobile number</dt>
                <dd className="mt-0.5 font-mono text-zinc-900 dark:text-zinc-100">
                  {dash(selected.mobile_number)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-zinc-500">Address</dt>
                <dd className="mt-0.5 whitespace-pre-wrap text-zinc-900 dark:text-zinc-100">
                  {dash(selected.address)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-zinc-500">Reference person number</dt>
                <dd className="mt-0.5 font-mono text-zinc-900 dark:text-zinc-100">
                  {dash(selected.reference_person_mobile)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-zinc-500">Relationship to reference</dt>
                <dd className="mt-0.5 text-zinc-900 dark:text-zinc-100">
                  {dash(selected.reference_relationship)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-zinc-500">Profile ID</dt>
                <dd className="mt-0.5 break-all font-mono text-xs text-zinc-600">{selected.id}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-zinc-500">Registered</dt>
                <dd className="mt-0.5 text-zinc-600">
                  {format(new Date(selected.created_at), "PPpp")}
                </dd>
              </div>
            </dl>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
