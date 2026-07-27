"use client";

import type { ReactNode } from "react";
import { useRole, type Role } from "@/lib/role-context";
import { roleAtLeast } from "@/lib/nav-config";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/shared/page-heading";

const UPGRADE_OPTIONS: Record<Role, { role: Role; label: string }[]> = {
  gast: [
    { role: "mitglied", label: "Als Mitglied ansehen" },
    { role: "admin", label: "Als Admin ansehen" },
  ],
  mitglied: [{ role: "admin", label: "Als Admin ansehen" }],
  admin: [],
};

export function RoleGate({
  minRole,
  children,
}: {
  minRole: Role;
  children: ReactNode;
}) {
  const { role, setRole } = useRole();

  if (roleAtLeast(role, minRole)) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Zugang geschützt"
        title="🔒 Nur für Mitglieder"
        description="Diese Seite gehört zu einem geschützten Bereich. Wechsle oben rechts die Rolle, um den Prototyp aus dieser Perspektive zu sehen."
      />
      <div className="flex flex-wrap gap-3">
        {UPGRADE_OPTIONS[role].map((option, index) => (
          <Button
            key={option.role}
            variant={index === 0 ? "default" : "outline"}
            onClick={() => setRole(option.role)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
