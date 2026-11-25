"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PasswordField } from "@/components/ui/password-input";
import { useAction } from "@/components/ui/use-action";
import { authClient } from "@/lib/auth/client";
import { translateAuthError, validatePassword } from "@/lib/auth/password";

/** Eigenes Login-Passwort ändern — nur auf dem eigenen Profil. Läuft direkt
 * über better-auth (`changePassword`), das das aktuelle Passwort prüft und
 * alle anderen Sitzungen beendet. */
export function PasswordChangeSection() {
  const [editing, setEditing] = useState(false);
  const [done, setDone] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const { run, pending, error, setError } = useAction({
    onSuccess: () => {
      setEditing(false);
      setDone(true);
    },
  });

  function open() {
    setCurrent("");
    setNext("");
    setConfirm("");
    setError(null);
    setDone(false);
    setEditing(true);
  }

  async function change() {
    const invalid = validatePassword(next);
    if (invalid) return { error: invalid };
    if (next !== confirm) {
      return { error: "Die eingegebenen Passwörter stimmen nicht überein." };
    }
    const { error: changeError } = await authClient.changePassword({
      currentPassword: current,
      newPassword: next,
      revokeOtherSessions: true,
    });
    if (!changeError) return { success: true as const };
    return {
      error:
        changeError.message === "Invalid password"
          ? "Das aktuelle Passwort ist falsch."
          : translateAuthError(changeError.message),
    };
  }

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>Passwort</CardTitle>
        <CardDescription>
          Ändere das Passwort, mit dem du dich anmeldest. Auf anderen Geräten
          wirst du dabei abgemeldet.
        </CardDescription>
        {!editing && (
          <CardAction>
            <Button variant="outline" size="sm" onClick={open}>
              <KeyRound className="size-3.5" />
              Ändern
            </Button>
          </CardAction>
        )}
      </CardHeader>

      {done && (
        <p className="bg-muted rounded-md px-3 py-2 text-sm">
          Dein Passwort wurde geändert.
        </p>
      )}

      {editing && (
        <div className="flex flex-col gap-4">
          <PasswordField
            id="password-change-current"
            label="Aktuelles Passwort"
            autoComplete="current-password"
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
          />
          <PasswordField
            id="password-change-new"
            label="Neues Passwort"
            autoComplete="new-password"
            value={next}
            onChange={(event) => setNext(event.target.value)}
          />
          <PasswordField
            id="password-change-confirm"
            label="Neues Passwort wiederholen"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
          />
          {error && <p className="text-destructive text-sm">{error}</p>}
          <div className="flex gap-2">
            <Button
              onClick={() => run(change)}
              disabled={pending || !current || !next || !confirm}
            >
              {pending ? "Speichere…" : "Passwort ändern"}
            </Button>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => setEditing(false)}
            >
              Abbrechen
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
