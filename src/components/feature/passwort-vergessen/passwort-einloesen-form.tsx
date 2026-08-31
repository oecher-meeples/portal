"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { authClient } from "@/lib/auth/client";
import { validatePassword } from "@/lib/auth/password";

/**
 * Klassischer Link-Flow (Token in der URL) — separat vom OTP-Flow in
 * `passwort-vergessen-form.tsx` (#324), weil Neon Auth für serverseitig
 * ausgelöste Resets (kein eingeloggter Nutzer, der `forgetPassword.emailOtp`
 * selbst aufrufen könnte) nur `auth.requestPasswordReset({email, redirectTo})`
 * anbietet — das verschickt einen Link mit Token, keinen Code. Genutzt vom
 * Systemkonto-Flow (#363): `createSystemkonto()` setzt `redirectTo` auf diese
 * Seite.
 */
export function PasswortEinloesenForm({ token }: { token: string | null }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!token) {
    return (
      <p className="text-destructive text-sm">
        Dieser Link ist unvollständig oder ungültig. Bitte fordere einen neuen
        Reset-Code über{" "}
        <a href="/passwort-vergessen" className="underline">
          Passwort vergessen
        </a>{" "}
        an.
      </p>
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (password !== passwordConfirm) {
      setError("Die eingegebenen Passwörter stimmen nicht überein.");
      return;
    }

    setIsSubmitting(true);
    const { error: resetError } = await authClient.resetPassword({
      newPassword: password,
      token: token!,
    });
    setIsSubmitting(false);

    if (resetError) {
      setError(
        "Der Link ist ungültig oder abgelaufen. Bitte fordere einen neuen an.",
      );
      return;
    }

    router.push("/login");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-card flex flex-col gap-4 rounded-lg border p-6"
    >
      <TextField
        id="einloesen-password"
        label="Neues Passwort"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
      />
      <TextField
        id="einloesen-password-confirm"
        label="Neues Passwort wiederholen"
        type="password"
        value={passwordConfirm}
        onChange={(event) => setPasswordConfirm(event.target.value)}
        required
      />
      {error && <p className="text-destructive text-sm">{error}</p>}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Wird gespeichert…" : "Passwort festlegen"}
      </Button>
    </form>
  );
}
