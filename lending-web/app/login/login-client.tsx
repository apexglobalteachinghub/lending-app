"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema } from "@/lib/validations";
import { createClient } from "@/lib/supabase/client";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import type { z } from "zod";

type Form = z.infer<typeof loginSchema>;

export function LoginClient() {
  const router = useRouter();
  const params = useSearchParams();
  const err = params.get("error");
  const form = useForm<Form>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: Form) {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword(values);
    if (error) {
      form.setError("root", { message: error.message });
      return;
    }
    const { data: prof } = await supabase
      .from("profiles")
      .select("role")
      .single();
    if (prof?.role === "customer") {
      await supabase.auth.signOut();
      form.setError("root", {
        message: "Customers use the mobile app to sign in.",
      });
      return;
    }
    if (prof?.role === "admin") router.push("/dashboard");
    else router.push("/loans");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-zinc-100 p-4 dark:from-zinc-950 dark:via-zinc-950 dark:to-emerald-950/30">
      <Card className="w-full max-w-md border-emerald-100/50 shadow-xl dark:border-emerald-900/30">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-emerald-800 dark:text-emerald-400">
            LendFlow Console
          </h1>
          <p className="mt-1 text-sm text-zinc-500">Admin & staff sign in</p>
        </div>
        {err === "staff_only" && (
          <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            This account is a customer. Please use the mobile app.
          </p>
        )}
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              className="mt-1"
              {...form.register("email")}
            />
            {form.formState.errors.email && (
              <p className="mt-1 text-xs text-red-600">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              className="mt-1"
              {...form.register("password")}
            />
            {form.formState.errors.password && (
              <p className="mt-1 text-xs text-red-600">
                {form.formState.errors.password.message}
              </p>
            )}
          </div>
          {form.formState.errors.root && (
            <p className="text-sm text-red-600">{form.formState.errors.root.message}</p>
          )}
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            Sign in
          </Button>
        </form>
        <p className="mt-6 text-center text-xs text-zinc-500">
          Need an account? Create one in Supabase Auth, then promote role in SQL or Users
          tab (first admin).
        </p>
        <p className="mt-2 text-center text-xs">
          <Link href="/" className="text-emerald-600 hover:underline dark:text-emerald-400">
            Home
          </Link>
        </p>
      </Card>
    </div>
  );
}
