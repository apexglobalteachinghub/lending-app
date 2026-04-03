import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role === "admin") redirect("/dashboard");
    if (profile?.role === "staff") redirect("/loans");
    redirect("/login?error=staff_only");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-br from-emerald-50 via-white to-zinc-100 p-6 dark:from-zinc-950 dark:via-zinc-950 dark:to-emerald-950/20">
      <div className="max-w-lg text-center">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">
          LendFlow
        </h1>
        <p className="mt-3 text-zinc-600 dark:text-zinc-400">
          Production-ready lending operations: KPI analytics for admins, loan and support
          tools for staff, and a dedicated mobile experience for customers.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/login">
          <Button>Staff / Admin login</Button>
        </Link>
      </div>
    </div>
  );
}
