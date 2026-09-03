"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClientValue } from "@/components/ui/use-client-value";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  // Intentional hydration-safe mount guard (next-themes pattern): resolvedTheme
  // is undefined on the server, so this avoids a client/server markup mismatch.
  const mounted = useClientValue(() => true, false);

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label="Theme umschalten"
      className={className}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {mounted && resolvedTheme === "dark" ? (
        <Sun className="size-4" />
      ) : (
        <Moon className="size-4" />
      )}
    </Button>
  );
}
