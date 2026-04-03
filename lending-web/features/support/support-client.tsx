"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supportReplySchema } from "@/lib/validations";
import { createClient } from "@/lib/supabase/client";
import type { Profile, SupportMessage, SupportStatus } from "@/lib/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

const PAGE_SIZE = 8;

type ReplyForm = z.infer<typeof supportReplySchema>;

export function SupportClient() {
  const [rows, setRows] = useState<SupportMessage[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<SupportStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<SupportMessage | null>(null);
  const [live, setLive] = useState(true);

  const load = useCallback(async () => {
    const supabase = createClient();
    setLoading(true);
    const { data: msgs } = await supabase
      .from("support_messages")
      .select("*")
      .order("created_at", { ascending: false });
    const { data: profs } = await supabase.from("profiles").select("*");
    const map: Record<string, Profile> = {};
    (profs as Profile[] | null)?.forEach((p) => {
      map[p.id] = p;
    });
    setProfiles(map);
    setRows((msgs as SupportMessage[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!live) return;
    const supabase = createClient();
    const ch = supabase
      .channel("support-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_messages" },
        () => void load()
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [live, load]);

  const filtered = useMemo(() => {
    let r = rows;
    if (filter !== "all") r = r.filter((x) => x.status === filter);
    const q = search.trim().toLowerCase();
    if (q) {
      r = r.filter(
        (x) =>
          x.message.toLowerCase().includes(q) ||
          (profiles[x.user_id]?.email ?? "").toLowerCase().includes(q)
      );
    }
    return r;
  }, [rows, filter, search, profiles]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, pageCount - 1);
  const slice = filtered.slice(pageSafe * PAGE_SIZE, pageSafe * PAGE_SIZE + PAGE_SIZE);

  useEffect(() => {
    setPage(0);
  }, [filter, search]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Support inbox
          </h1>
          <p className="text-sm text-zinc-500">
            Filter, search, reply, and resolve customer messages.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant={live ? "primary" : "secondary"} onClick={() => setLive((v) => !v)}>
            Live: {live ? "on" : "off"}
          </Button>
        </div>
      </div>

      <Card className="flex flex-wrap gap-4">
        <div className="min-w-[200px] flex-1">
          <Label htmlFor="search">Search</Label>
          <Input
            id="search"
            placeholder="Message or email…"
            className="mt-1"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div>
          <Label>Status</Label>
          <div className="mt-2 flex gap-2">
            {(["all", "open", "resolved"] as const).map((s) => (
              <Button
                key={s}
                variant={filter === s ? "primary" : "secondary"}
                className="capitalize"
                type="button"
                onClick={() => setFilter(s)}
              >
                {s}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 overflow-x-auto">
          {loading ? (
            <p className="text-sm text-zinc-500">Loading…</p>
          ) : (
            <>
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
                    <th className="pb-2 pr-4">When</th>
                    <th className="pb-2 pr-4">User</th>
                    <th className="pb-2 pr-4">Preview</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {slice.map((m) => (
                    <tr
                      key={m.id}
                      className={`cursor-pointer border-b border-zinc-100 dark:border-zinc-800/80 ${
                        selected?.id === m.id ? "bg-emerald-50/50 dark:bg-emerald-950/20" : ""
                      }`}
                      onClick={() => setSelected(m)}
                    >
                      <td className="py-3 pr-4 text-zinc-600">
                        {format(new Date(m.created_at), "MMM d, HH:mm")}
                      </td>
                      <td className="py-3 pr-4">
                        {profiles[m.user_id]?.email ?? m.user_id.slice(0, 8)}
                      </td>
                      <td className="max-w-[200px] truncate py-3 pr-4">{m.message}</td>
                      <td className="py-3 pr-4 capitalize">{m.status}</td>
                      <td className="py-3">
                        <Button variant="ghost" className="!px-2 text-xs" type="button">
                          Open
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 flex items-center justify-between gap-2">
                <p className="text-xs text-zinc-500">
                  Page {pageSafe + 1} / {pageCount} · {filtered.length} total
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={pageSafe <= 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    Prev
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={pageSafe >= pageCount - 1}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
            Details
          </h2>
          {selected ? (
            <SupportDetail
              message={selected}
              email={profiles[selected.user_id]?.email ?? null}
              onUpdated={() => void load()}
            />
          ) : (
            <p className="mt-4 text-sm text-zinc-500">Select a row to view and reply.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

function SupportDetail({
  message,
  email,
  onUpdated,
}: {
  message: SupportMessage;
  email: string | null;
  onUpdated: () => void;
}) {
  const form = useForm<ReplyForm>({
    resolver: zodResolver(supportReplySchema),
    defaultValues: {
      staff_reply: message.staff_reply ?? "",
      status: message.status,
    },
  });

  useEffect(() => {
    form.reset({
      staff_reply: message.staff_reply ?? "",
      status: message.status,
    });
  }, [message, form]);

  async function onSubmit(values: ReplyForm) {
    const supabase = createClient();
    await supabase
      .from("support_messages")
      .update({
        staff_reply: values.staff_reply,
        status: values.status,
      })
      .eq("id", message.id);
    onUpdated();
  }

  return (
    <div className="mt-4 space-y-4">
      <div>
        <p className="text-xs font-medium text-zinc-500">Linked account</p>
        <p className="text-sm text-zinc-900 dark:text-zinc-100">{email ?? message.user_id}</p>
      </div>
      <div>
        <p className="text-xs font-medium text-zinc-500">Customer message</p>
        <p className="mt-1 rounded-lg bg-zinc-100 p-3 text-sm dark:bg-zinc-800">
          {message.message}
        </p>
      </div>
      <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
        <div>
          <Label htmlFor="staff_reply">Staff reply</Label>
          <textarea
            id="staff_reply"
            className="mt-1 min-h-[100px] w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            {...form.register("staff_reply")}
          />
          {form.formState.errors.staff_reply && (
            <p className="text-xs text-red-600">{form.formState.errors.staff_reply.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            {...form.register("status")}
          >
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          Save response
        </Button>
      </form>
    </div>
  );
}
