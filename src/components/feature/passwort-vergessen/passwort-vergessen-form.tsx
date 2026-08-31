"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { authClient } from "@/lib/auth/client";
import { validatePassword } from "@/lib/auth/password";

/**
 * Zwei-Schritt-Flow (#324): erst E-Mail anfordern (Neon Auth verschickt den
 * OTP-Code selbst — sendet immer `{success:true}`, unabhängig davon, ob ein
 * Konto existiert, siehe `authClient.forgetPassword.emailOtp`), dann Code +
 * neues Passwort auf derselben Seite eingeben. Kein eigenes Token-Modell
 * nötig — Neon Auth verwaltet Ausstellung/Ablauf/Einmalverwendung des OTP.
 */
export function PasswortVergessenForm() {
  const router = useRouter();
  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleRequest(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await authClient.forgetPassword.emailOtp({ email });
    } catch {
      // Absichtlich keine Fehleranzeige — sonst wäre erkennbar, ob die
      // E-Mail-Adresse existiert (Enumeration-Schutz, #324/#326).
    } finally {
      setIsSubmitting(false);
      setStep("reset");
    }
  }

  async function handleReset(event: React.FormEvent) {
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
    const { error: resetError } = await authClient.emailOtp.resetPassword({
      email,
      otp,
      password,
    });
    setIsSubmitting(false);

    if (resetError) {
      setError(
        "Der Code ist ungültig oder abgelaufen. Bitte fordere einen neuen an.",
      );
      return;
    }

    router.push("/login");
  }

  if (step === "request") {
    return (
      <form
        onSubmit={handleRequest}
        className="bg-card flex flex-col gap-4 rounded-lg border p-6"
      >
        <TextField
          id="forgot-email"
          label="E-Mail"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="du@beispiel.de"
          required
        />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Wird gesendet…" : "Code anfordern"}
        </Button>
      </form>
    );
  }

  return (
    <form
      onSubmit={handleReset}
      className="bg-card flex flex-col gap-4 rounded-lg border p-6"
    >
      <p className="text-muted-foreground text-sm">
        Falls für <strong>{email}</strong> ein Konto besteht, wurde ein Code
        per E-Mail versendet. Trage ihn hier zusammen mit deinem neuen
        Passwort ein.
      </p>
      <TextField
        id="forgot-otp"
        label="Code aus der E-Mail"
        value={otp}
        onChange={(event) => setOtp(event.target.value)}
        className="font-mono text-sm"
        required
      />
      <TextField
        id="forgot-password"
        label="Neues Passwort"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
      />
      <TextField
        id="forgot-password-confirm"
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
      <Button
        type="button"
        variant="link"
        onClick={() => setStep("request")}
        disabled={isSubmitting}
      >
        Keinen Code erhalten? Erneut anfordern
      </Button>
    </form>
  );
}
