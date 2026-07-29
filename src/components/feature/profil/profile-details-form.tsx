"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateOwnProfile } from "@/components/feature/profil/actions";

export function ProfileDetailsForm({
  displayName: initialDisplayName,
  bggUsername: initialBggUsername,
  bgaUsername: initialBgaUsername,
}: {
  displayName: string;
  bggUsername: string | null;
  bgaUsername: string | null;
}) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [bggUsername, setBggUsername] = useState(initialBggUsername ?? "");
  const [bgaUsername, setBgaUsername] = useState(initialBgaUsername ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setMessage(null);

    const result = await updateOwnProfile({
      displayName,
      bggUsername,
      bgaUsername,
    });
    setIsSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    setMessage("Profil gespeichert.");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="displayName">Anzeigename</Label>
        <Input
          id="displayName"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bggUsername">BoardGameGeek-Username</Label>
          <Input
            id="bggUsername"
            value={bggUsername}
            onChange={(event) => setBggUsername(event.target.value)}
            placeholder="optional"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bgaUsername">Board-Game-Arena-Username</Label>
          <Input
            id="bgaUsername"
            value={bgaUsername}
            onChange={(event) => setBgaUsername(event.target.value)}
            placeholder="optional"
          />
        </div>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}
      {message && <p className="text-sm text-emerald-600">{message}</p>}

      <Button type="submit" disabled={isSaving} className="w-fit">
        {isSaving ? "Speichere…" : "Änderungen speichern"}
      </Button>
    </form>
  );
}
