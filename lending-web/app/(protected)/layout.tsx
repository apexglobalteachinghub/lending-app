import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";
import { redirect } from "next/navigation";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, email")
    .eq("id", user.id)
    .single();

  const role = profile?.role as UserRole | undefined;
  if (!role || role === "customer") {
    redirect("/login?error=staff_only");
  }

  return (
    <AppShell role={role} email={profile?.email ?? user.email ?? null}>
      {children}
    </AppShell>
  );
}
