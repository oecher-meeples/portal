"use client";

import { cardVariants } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { PasswordField } from "@/components/ui/password-input";
import { redeemInvite } from "@/components/feature/registrieren/actions";
import { validatePassword } from "@/lib/auth/password";

export function RegisterForm({
  defaultToken,
  defaultEmail,
}: {
  defaultToken?: string;
  defaultEmail?: string;
}) {
  const router = useRouter();
  const [token, setToken] = useState(defaultToken ?? "");
  const [name, setName] = useState("");
  const [email, setEmail] = useState(defaultEmail ?? "");
  const emailLocked = Boolean(defaultEmail);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    const result = await redeemInvite({ token, email, password, name });

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    router.push("/login");
  }

  return (
    <form onSubmit={handleSubmit} className={cn(cardVariants(), "gap-4")}>
      <Field label="Einladungs-Token" htmlFor="token">
        <Input
          id="token"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          placeholder="Aus der Einladungs-E-Mail"
          className="font-mono text-sm"
          required
        />
      </Field>
      <Field label="Name" htmlFor="name">
        <Input
          id="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </Field>
      <Field label="E-Mail" htmlFor="reg-email">
        <Input
          id="reg-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          readOnly={emailLocked}
          required
        />
      </Field>
      <PasswordField
        id="reg-password"
        label="Passwort festlegen"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
      />
      <PasswordField
        id="reg-password-confirm"
        label="Passwort wiederholen"
        value={passwordConfirm}
        onChange={(event) => setPasswordConfirm(event.target.value)}
        required
      />
      {error && <p className="text-destructive text-sm">{error}</p>}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Konto wird aktiviert…" : "Konto aktivieren"}
      </Button>
    </form>
  );
}
