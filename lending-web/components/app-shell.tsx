"use client";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/types";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links: { href: string; label: string; roles: UserRole[] }[] = [
  { href: "/dashboard", label: "Dashboard", roles: ["admin"] },
  { href: "/loans", label: "Loans", roles: ["admin", "staff"] },
  { href: "/customers", label: "Customers", roles: ["admin", "staff"] },
  { href: "/support", label: "Support", roles: ["admin", "staff"] },
  { href: "/users", label: "Users", roles: ["admin"] },
];

export function AppShell({
  role,
  email,
  children,
}: {
  role: UserRole;
  email: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const visible = links.filter((l) => l.roles.includes(role));
  const homeHref = role === "admin" ? "/dashboard" : "/loans";

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex flex-col border-b border-zinc-200 bg-zinc-50/90 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90 md:min-h-screen md:w-56 md:shrink-0 md:border-b-0 md:border-r">
        {/* Mobile: single row. Desktop: stack logo + account (no fixed height — avoids overlap). */}
        <div className="flex h-14 shrink-0 items-center px-4 md:h-auto md:flex-col md:items-stretch md:gap-3 md:px-4 md:py-5">
          <div className="flex w-full items-center justify-between md:block">
            <Link
              href={homeHref}
              className="text-lg font-semibold tracking-tight text-emerald-700 dark:text-emerald-400"
            >
              LendFlow
            </Link>
          </div>
          <div className="hidden w-full min-w-0 space-y-1 border-zinc-200 pt-1 dark:border-zinc-800 md:block md:border-t md:pt-3">
            <p className="truncate text-xs leading-snug text-zinc-500" title={email ?? undefined}>
              {email}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              {role}
            </p>
          </div>
        </div>
        <nav className="flex min-h-0 gap-1 overflow-x-auto px-2 pb-2 md:flex-1 md:flex-col md:overflow-y-auto md:overflow-x-visible md:px-3 md:pb-3">
          {visible.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors md:w-full ${
                pathname === l.href
                  ? "bg-emerald-600/10 text-emerald-800 dark:text-emerald-300"
                  : "text-zinc-600 hover:bg-zinc-200/80 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto hidden shrink-0 flex-col gap-2 border-t border-zinc-200 p-3 dark:border-zinc-800 md:flex">
          <ThemeToggle />
          <Button variant="secondary" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-end gap-2 border-b border-zinc-200 px-4 dark:border-zinc-800 md:hidden">
          <ThemeToggle />
          <Button variant="secondary" className="!px-3 text-xs" onClick={signOut}>
            Out
          </Button>
        </header>
        <main className="flex-1 bg-gradient-to-br from-zinc-50 via-white to-emerald-50/30 p-4 dark:from-zinc-950 dark:via-zinc-950 dark:to-emerald-950/20 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
