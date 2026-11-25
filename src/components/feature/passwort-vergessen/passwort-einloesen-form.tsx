"use client";

import { cardVariants } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PasswordField } from "@/components/ui/password-input";
import { authClient } from "@/lib/auth/client";
import { validatePassword } from "@/lib/auth/password";

/**
 * Klassischer Link-Flow (Token in der URL) — separat vom OTP-Flow in
 * `passwort-vergessen-form.tsx` (#324), weil der serverseitig ausgelöste
 * Reset (kein eingeloggter Nutzer, der `emailOtp.requestPasswordReset` selbst
 * aufrufen könnte) über `auth.api.requestPasswordReset({ body: { email,
 * redirectTo } })` läuft — das verschickt einen Link mit Token, keinen Code. Genutzt vom
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
    <form onSubmit={handleSubmit} className={cn(cardVariants(), "gap-4")}>
      <PasswordField
        id="einloesen-password"
        label="Neues Passwort"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
      />
      <PasswordField
        id="einloesen-password-confirm"
        label="Neues Passwort wiederholen"
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
