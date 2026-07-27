"use client";

import { useRole, type Role } from "@/lib/role-context";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<Role, string> = {
  gast: "Gast",
  mitglied: "Mitglied",
  admin: "Admin",
};

export function RoleSwitcher() {
  const { role, setRole } = useRole();

  return (
    <div className="flex items-center gap-1 rounded-full border bg-muted/40 p-1 text-sm">
      {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => setRole(r)}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1 font-medium transition-colors",
            role === r
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              role === r ? "bg-primary-foreground" : "bg-muted-foreground/50",
            )}
          />
          {ROLE_LABELS[r]}
        </button>
      ))}
    </div>
  );
}
