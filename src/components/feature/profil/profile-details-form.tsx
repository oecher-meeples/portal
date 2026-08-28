"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { TextAreaField } from "@/components/ui/field";
import { updateOwnProfile } from "@/components/feature/profil/actions";

export function ProfileDetailsForm({
  displayName: initialDisplayName,
  bggUsername: initialBggUsername,
  bgaUsername: initialBgaUsername,
  telegramHandle: initialTelegramHandle,
  signalHandle: initialSignalHandle,
  discordHandle: initialDiscordHandle,
  address: initialAddress,
  shareAddress: initialShareAddress,
  doorbellNote: initialDoorbellNote,
  privateCollectionVisible: initialPrivateCollectionVisible,
}: {
  displayName: string;
  bggUsername: string | null;
  bgaUsername: string | null;
  telegramHandle: string | null;
  signalHandle: string | null;
  discordHandle: string | null;
  address: string | null;
  shareAddress: boolean;
  doorbellNote: string | null;
  privateCollectionVisible: boolean;
}) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [bggUsername, setBggUsername] = useState(initialBggUsername ?? "");
  const [bgaUsername, setBgaUsername] = useState(initialBgaUsername ?? "");
  const [telegramHandle, setTelegramHandle] = useState(
    initialTelegramHandle ?? "",
  );
  const [signalHandle, setSignalHandle] = useState(initialSignalHandle ?? "");
  const [discordHandle, setDiscordHandle] = useState(
    initialDiscordHandle ?? "",
  );
  const [address, setAddress] = useState(initialAddress ?? "");
  const [privateCollectionVisible, setPrivateCollectionVisible] = useState(
    Boolean(initialPrivateCollectionVisible),
  );
  const [shareAddress, setShareAddress] = useState(
    Boolean(initialShareAddress),
  );
  const [doorbellNote, setDoorbellNote] = useState(initialDoorbellNote ?? "");
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
      telegramHandle,
      signalHandle,
      discordHandle,
      address,
      shareAddress,
      doorbellNote,
      privateCollectionVisible,
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
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="telegramHandle">Telegram</Label>
          <Input
            id="telegramHandle"
            value={telegramHandle}
            onChange={(event) => setTelegramHandle(event.target.value)}
            placeholder="ohne @"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="signalHandle">Signal</Label>
          <Input
            id="signalHandle"
            value={signalHandle}
            onChange={(event) => setSignalHandle(event.target.value)}
            placeholder="ohne @"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="discordHandle">Discord</Label>
          <Input
            id="discordHandle"
            value={discordHandle}
            onChange={(event) => setDiscordHandle(event.target.value)}
            placeholder="ohne @"
          />
        </div>
      </div>

      <TextAreaField
        id="address"
        label="Wohnort"
        hint="Nur für dich sichtbar. Wird für andere erst sichtbar, wenn du sie bei einem Spielgesuch (LFG) explizit per Autofill übernimmst, oder wenn du sie unten für alle Meeples freigibst."
        value={address}
        onChange={(event) => setAddress(event.target.value)}
        placeholder="optional"
        rows={2}
      />
      <Label className="flex items-center justify-between gap-2 font-normal">
        Adresse für Meeple freigeben
        <Switch
          id="shareAddress"
          checked={shareAddress}
          onCheckedChange={setShareAddress}
        />
      </Label>
      <p className="text-muted-foreground -mt-2.5 text-xs">
        Zeigt deinen Wohnort in den Kontaktmöglichkeiten (z. B. bei Ludothek-
        Standort oder Marktplatz-Angeboten) für alle eingeloggten Meeples an.
      </p>
      <Label className="flex items-center justify-between gap-2 font-normal">
        Private BGG-Collection anderen Meeple anzeigen
        <Switch
          id="privateCollectionVisible"
          checked={privateCollectionVisible}
          onCheckedChange={setPrivateCollectionVisible}
        />
      </Label>
      <p className="text-muted-foreground -mt-2.5 text-xs">
        Deine importierte BGG-Collection wird für andere eingeloggte Meeples im
        Ludothek-Filter „auch private anzeigen“ sichtbar.
      </p>
      <TextAreaField
        id="doorbellNote"
        label="Notiz zum Klingelschild"
        hint="z. B. „bei Fam. Reiners klingeln“. Nur für dich sichtbar, außer du gibst deinen Wohnort bei einem Spielgesuch frei."
        value={doorbellNote}
        onChange={(event) => setDoorbellNote(event.target.value)}
        placeholder="optional"
        rows={2}
      />

      {error && <p className="text-destructive text-sm">{error}</p>}
      {message && <p className="text-sm text-emerald-600">{message}</p>}

      <Button type="submit" disabled={isSaving} className="w-fit">
        {isSaving ? "Speichere…" : "Änderungen speichern"}
      </Button>
    </form>
  );
}
