"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAction } from "@/components/ui/use-action";
import { MAX_INVITE_DAYS } from "@/lib/members/invites";
import { updateDefaultInviteDays } from "@/components/feature/admin-settings/actions";

export function InviteSettingsForm({ defaultDays }: { defaultDays: number }) {
  const [days, setDays] = useState(defaultDays);
  const { run, pending, error } = useAction();

  return (
    <div className="bg-card flex flex-col gap-4 rounded-lg border p-6">
      <div className="flex flex-col gap-1.5 sm:max-w-xs">
        <Label htmlFor="default-invite-days">
          Standard-Gültigkeitsdauer (Tage)
        </Label>
        <Input
          id="default-invite-days"
          type="number"
          min={0}
          max={MAX_INVITE_DAYS}
          step={0.5}
          value={days}
          onChange={(event) => setDays(Number(event.target.value))}
        />
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      <Button
        disabled={pending}
        onClick={() => run(() => updateDefaultInviteDays(days))}
        className="self-start"
      >
        {pending ? "Speichere…" : "Speichern"}
      </Button>
    </div>
  );
}
