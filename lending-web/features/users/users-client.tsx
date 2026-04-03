"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { profileRoleSchema } from "@/lib/validations";
import { createClient } from "@/lib/supabase/client";
import type { Profile, UserRole } from "@/lib/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

type RoleFormValues = z.infer<typeof profileRoleSchema>;

export function UsersClient() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const supabase = createClient();
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    setProfiles((data as Profile[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Users</h1>
        <p className="text-sm text-zinc-500">Assign admin, staff, or customer roles.</p>
      </div>

      <Card className="overflow-x-auto">
        {loading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : (
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
                <th className="pb-2 pr-4">Email</th>
                <th className="pb-2 pr-4">Role</th>
                <th className="pb-2 pr-4">Joined</th>
                <th className="pb-2">Save</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <UserRow key={p.id} profile={p} onSaved={refresh} />
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function UserRow({
  profile,
  onSaved,
}: {
  profile: Profile;
  onSaved: () => void;
}) {
  const form = useForm<RoleFormValues>({
    resolver: zodResolver(profileRoleSchema),
    defaultValues: { role: profile.role },
  });

  useEffect(() => {
    form.reset({ role: profile.role });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync select when server data refreshes
  }, [profile.id, profile.role]);

  async function save(values: RoleFormValues) {
    const supabase = createClient();
    await supabase.from("profiles").update({ role: values.role }).eq("id", profile.id);
    onSaved();
  }

  return (
    <tr className="border-b border-zinc-100 dark:border-zinc-800/80">
      <td className="py-3 pr-4">{profile.email}</td>
      <td className="py-3 pr-4">
        <select
          className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          {...form.register("role")}
        >
          {(["admin", "staff", "customer"] as UserRole[]).map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </td>
      <td className="py-3 pr-4 text-zinc-600">
        {format(new Date(profile.created_at), "MMM d, yyyy")}
      </td>
      <td className="py-3">
        <Button type="button" onClick={form.handleSubmit(save)}>
          Update
        </Button>
      </td>
    </tr>
  );
}
