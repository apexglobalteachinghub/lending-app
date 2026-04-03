"use client";

import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <span className="h-9 w-20" />;
  const next = resolvedTheme === "dark" ? "light" : "dark";
  return (
    <Button
      variant="ghost"
      className="!px-3"
      onClick={() => setTheme(next)}
      aria-label="Toggle theme"
    >
      {theme === "system" ? "System" : resolvedTheme === "dark" ? "Dark" : "Light"}
      <span className="ml-2 text-xs opacity-70">→ {next}</span>
    </Button>
  );
}
