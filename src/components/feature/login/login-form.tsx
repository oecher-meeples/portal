"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeading } from "@/components/ui/page-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";
import { translateAuthError } from "@/lib/auth/password";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const { error: signInError } = await authClient.signIn.email({
        email,
        password,
      });

      if (signInError) {
        setError(translateAuthError(signInError.message));
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      // Netzwerkfehler o.ä. — ohne dieses catch bliebe der Button dauerhaft
      // im "Anmelden…"-Zustand hängen, ohne dass der Nutzer je eine
      // Rückmeldung bekommt.
      setError("Das hat leider nicht funktioniert. Bitte versuche es erneut.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
      <PageHeading eyebrow="Mitgliederbereich" title="Anmelden" />
      <form
        onSubmit={handleSubmit}
        className="bg-card flex flex-col gap-4 rounded-lg border p-6"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">E-Mail</Label>
          <Input
            id="email"
            type="email"
            placeholder="du@beispiel.de"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Passwort</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Anmelden…" : "Anmelden"}
        </Button>
      </form>
      <p className="text-muted-foreground text-center text-sm">
        Einladung erhalten?{" "}
        <Link href="/registrieren" className="text-primary hover:underline">
          Konto einrichten
        </Link>
      </p>
    </div>
  );
}
